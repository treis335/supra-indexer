import { Handler, saveEvent } from './base';
import { Event, ProtocolConfig } from '../types';
import { pool } from '../db/pool';

export const dexlynSwapHandler: Handler = {
    async handle(event: Event, txnHash: string, protocol: ProtocolConfig, blockHeight: number) {
        const data = event.data;
        const pair_x = data.pair_x;
        const pair_y = data.pair_y;
        const x_in = data.x_in;
        const x_out = data.x_out;
        const y_in = data.y_in;
        const y_out = data.y_out;
        const timestamp = data.timestamp;

        await saveEvent(txnHash, protocol.name, protocol.event_type, data, blockHeight);

        const query = `
            INSERT INTO dex_swaps (txn_hash, protocol, pair_x, pair_y, amount_x_in, amount_x_out, amount_y_in, amount_y_out, timestamp, block_height)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        await pool.query(query, [
            txnHash, protocol.name, pair_x, pair_y,
            x_in, x_out, y_in, y_out,
            timestamp, blockHeight
        ]);

        console.log(`[${protocol.name}] Swap detected: ${pair_x} <-> ${pair_y} (tx: ${txnHash})`);
    }
};