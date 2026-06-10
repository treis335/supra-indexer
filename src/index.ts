import dotenv from 'dotenv';
import { pool } from './db/pool';
import { getLatestBlockHeight, getBlock } from './utils/rpc';
import { protocols } from './config';
import { dexlynSwapHandler } from './handlers/dexlyn';
import { Event } from './types';

dotenv.config();

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);
const START_BLOCK_OFFSET = parseInt(process.env.START_BLOCK_OFFSET || '100', 10);
const MAX_BLOCKS_PER_REQUEST = parseInt(process.env.MAX_BLOCKS_PER_REQUEST || '20', 10);

const handlers: Record<string, any> = {
    dexlynSwapHandler
};

async function getLastProcessedHeight(): Promise<number> {
    const res = await pool.query('SELECT last_processed_height FROM indexer_state WHERE id = 1');
    if (res.rows.length === 0) {
        const current = await getLatestBlockHeight();
        const start = Math.max(1, current - START_BLOCK_OFFSET);
        await pool.query('INSERT INTO indexer_state (id, last_processed_height) VALUES (1, $1)', [start]);
        return start;
    }
    return res.rows[0].last_processed_height;
}

async function updateLastProcessedHeight(height: number) {
    await pool.query('UPDATE indexer_state SET last_processed_height = $1 WHERE id = 1', [height]);
}

async function processBlock(height: number) {
    console.log(`[Block] Processing height ${height}...`);
    const block = await getBlock(height);

    for (const tx of block.transactions) {
        await pool.query(
            `INSERT INTO transactions (txn_hash, block_height, success, vm_status, timestamp)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (txn_hash) DO NOTHING`,
            [tx.txn_hash, height, tx.success, tx.vm_status, tx.timestamp || null]
        );

        for (const ev of tx.output.events) {
            for (const protocol of protocols) {
                if (ev.type.includes(protocol.event_type) && ev.type.includes(protocol.contract_address)) {
                    const handler = handlers[protocol.handler];
                    if (handler) {
                        await handler.handle(ev, tx.txn_hash, protocol, height);
                    } else {
                        console.warn(`Handler ${protocol.handler} not found`);
                    }
                }
            }
        }
    }
}

async function mainLoop() {
    try {
        const currentHeight = await getLatestBlockHeight();
        let lastProcessed = await getLastProcessedHeight();

        if (currentHeight <= lastProcessed) return;

        let start = lastProcessed + 1;
        let end = Math.min(currentHeight, start + MAX_BLOCKS_PER_REQUEST - 1);

        while (start <= currentHeight) {
            for (let h = start; h <= end; h++) {
                await processBlock(h);
            }
            await updateLastProcessedHeight(end);
            start = end + 1;
            end = Math.min(currentHeight, start + MAX_BLOCKS_PER_REQUEST - 1);
        }
    } catch (err) {
        console.error('Main loop error:', err);
    }
}

async function init() {
    console.log('Supra modular indexer started');
    await mainLoop();
    setInterval(mainLoop, POLL_INTERVAL_MS);
}

process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await pool.end();
    process.exit(0);
});

init().catch(console.error);