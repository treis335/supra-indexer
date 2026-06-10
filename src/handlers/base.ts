import { pool } from '../db/pool';
import { Event, ProtocolConfig } from '../types';

export interface Handler {
    handle(event: Event, txnHash: string, protocol: ProtocolConfig, blockHeight: number): Promise<void>;
}

export async function saveEvent(
    txnHash: string,
    protocol: string,
    eventType: string,
    data: any,
    blockHeight: number
): Promise<void> {
    await pool.query(
        `INSERT INTO events (txn_hash, protocol, event_type, event_data, block_height)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [txnHash, protocol, eventType, JSON.stringify(data), blockHeight]
    );
}
