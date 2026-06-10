import axios from 'axios';
import { Block, Transaction, Event, SupraConsensusBlock } from '../types';

const RPC_URL = process.env.SUPRA_RPC_URL || 'https://rpc-mainnet.supra.com/rpc/v1';

export async function getLatestBlockHeight(): Promise<number> {
    const res = await axios.get(`${RPC_URL}/block`);
    return res.data.height;
}

// Endpoint correto da Supra: GET /rpc/v1/consensus/block/height/{height}?with_batches=true
// Devolve o bloco com todos os batches de transações finalizadas
export async function getBlock(height: number): Promise<Block> {
    const res = await axios.get<SupraConsensusBlock>(
        `${RPC_URL}/consensus/block/height/${height}`,
        { params: { with_batches: true } }
    );

    const raw = res.data;
    const transactions: Transaction[] = [];

    // DEBUG: log sempre para ver o que vem do RPC
    console.log(`[RPC DEBUG] Block ${height} raw keys: ${Object.keys(raw).join(', ')}`);
    console.log(`[RPC DEBUG] raw sample: ${JSON.stringify(raw).substring(0, 400)}`);

    // As transações estão nos batches: raw.batches[batchHash].transactions[]
    if (raw.batches) {
        for (const batchHash of Object.keys(raw.batches)) {
            const batch = raw.batches[batchHash];
            const txList = batch.transactions || [];

            for (const tx of txList) {
                if (!tx.hash) continue;

                // Normalizar para a estrutura interna do indexer
                const moveOutput = tx.output?.Move;
                const events: Event[] = (moveOutput?.events || []).map(ev => ({
                    type: ev.type,
                    data: ev.data,
                    guid: ev.guid,
                }));

                const vmStatus = moveOutput?.vm_status || tx.status || 'unknown';
                const success = vmStatus === 'Executed successfully' || tx.status === 'Success';

                // Timestamp: vem do header do bloco
                const blockTimestamp = raw.block?.block?.header?.timestamp?.timestamp;

                transactions.push({
                    txn_hash: tx.hash,
                    success,
                    vm_status: vmStatus,
                    output: { events },
                    timestamp: blockTimestamp,
                });
            }
        }
    }

    return {
        height,
        transactions,
    };
}
