import { Event, ProtocolConfig } from '../types';
import { pool } from '../db/pool';

export interface Handler {
    handle(event: Event, txnHash: string, protocol: ProtocolConfig, blockHeight: number): Promise<void>;
}

export async function saveEvent(txnHash: string, protocol: string, eventType: string, eventData: any, blockHeight: number) {
    const query = `
        INSERT INTO events (txn_hash, protocol, event_type, event_data, block_height)
        VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(query, [txnHash, protocol, eventType, eventData, blockHeight]);
}