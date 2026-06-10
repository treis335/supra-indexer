import dotenv from 'dotenv';
dotenv.config();

import { pool } from './db/pool';
import { getLatestBlockHeight, getBlock } from './utils/rpc';
import { protocols } from './config';
import { dexlynSwapHandler } from './handlers/dexlyn';
import { Event } from './types';

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);
const START_BLOCK_OFFSET = parseInt(process.env.START_BLOCK_OFFSET || '100', 10);
const MAX_BLOCKS_PER_REQUEST = parseInt(process.env.MAX_BLOCKS_PER_REQUEST || '20', 10);

const handlers: Record<string, any> = { dexlynSwapHandler };

async function getLastProcessedHeight(): Promise<number> {
    const res = await pool.query('SELECT last_processed_height FROM indexer_state WHERE id = 1');
    if (res.rows.length === 0) {
        const current = await getLatestBlockHeight();
        const start = Math.max(1, current - START_BLOCK_OFFSET);
        await pool.query(
            'INSERT INTO indexer_state (id, last_processed_height) VALUES (1, $1)',
            [start]
        );
        console.log(`[Init] Starting from block ${start} (current: ${current})`);
        return start;
    }
    return res.rows[0].last_processed_height;
}

async function updateLastProcessedHeight(height: number) {
    await pool.query(
        'UPDATE indexer_state SET last_processed_height = $1, updated_at = NOW() WHERE id = 1',
        [height]
    );
}

async function processBlock(height: number) {
    console.log(`[Block] Processing ${height}...`);
    const block = await getBlock(height);

    if (block.transactions.length === 0) {
        console.log(`[Block] ${height} — no transactions`);
        return;
    }

    console.log(`[Block] ${height} — ${block.transactions.length} transactions`);
    let swapCount = 0;

    for (const tx of block.transactions) {
        await pool.query(
            `INSERT INTO transactions (txn_hash, block_height, success, vm_status, timestamp)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (txn_hash) DO NOTHING`,
            [tx.txn_hash, height, tx.success, tx.vm_status, tx.timestamp || null]
        );

        for (const ev of tx.output.events) {
            for (const protocol of protocols) {
                if (
                    ev.type.includes(protocol.event_type) &&
                    ev.type.includes(protocol.contract_address)
                ) {
                    const handler = handlers[protocol.handler];
                    if (handler) {
                        await handler.handle(ev, tx.txn_hash, protocol, height);
                        swapCount++;
                    } else {
                        console.warn(`[Warn] Handler not found: ${protocol.handler}`);
                    }
                }
            }
        }
    }

    if (swapCount > 0) {
        console.log(`[Block] ${height} — ${swapCount} swap(s) indexed ✅`);
    }
}

async function mainLoop() {
    try {
        const currentHeight = await getLatestBlockHeight();
        const lastProcessed = await getLastProcessedHeight();

        if (currentHeight <= lastProcessed) {
            return; // silencioso quando está atualizado
        }

        const behind = currentHeight - lastProcessed;
        if (behind > 1) {
            console.log(`[Loop] Behind by ${behind} blocks (last: ${lastProcessed}, current: ${currentHeight})`);
        }

        const batchEnd = Math.min(currentHeight, lastProcessed + MAX_BLOCKS_PER_REQUEST);

        for (let h = lastProcessed + 1; h <= batchEnd; h++) {
            try {
                await processBlock(h);
            } catch (blockErr: any) {
                console.error(`[Block ${h} ERROR] ${blockErr?.message || blockErr}`);
                // Mesmo com erro, guarda progresso para não ficar preso no mesmo bloco
            }
        }

        await updateLastProcessedHeight(batchEnd);
        console.log(`[Loop] Processed blocks ${(lastProcessed + 1)} to ${batchEnd}`);

    } catch (err: any) {
        console.error('[Loop ERROR]', err?.message || err);
    }
}

async function init() {
    console.log('🚀 Supra modular indexer started');
    console.log(`   RPC: ${process.env.SUPRA_RPC_URL}`);
    console.log(`   DB:  ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    console.log(`   Poll interval: ${POLL_INTERVAL_MS}ms`);

    // Testar ligação à BD antes de arrancar
    try {
        await pool.query('SELECT 1');
        console.log('✅ Database connected');
    } catch (err: any) {
        console.error('❌ Database connection failed:', err.message);
        console.error('   Make sure PostgreSQL is running and the .env credentials are correct.');
        console.error('   Run the schema: psql -U indexer_user -d supra_indexer -f src/db/schema.sql');
        process.exit(1);
    }

    // Testar ligação ao RPC
    try {
        const height = await getLatestBlockHeight();
        console.log(`✅ RPC connected — latest block: ${height}`);
    } catch (err: any) {
        console.error('❌ RPC connection failed:', err.message);
        process.exit(1);
    }

    await mainLoop();
    setInterval(mainLoop, POLL_INTERVAL_MS);
}

process.on('SIGINT', async () => {
    console.log('\n[Shutdown] Closing DB pool...');
    await pool.end();
    process.exit(0);
});

init().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
