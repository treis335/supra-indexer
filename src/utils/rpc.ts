import axios from 'axios';
import { Block } from '../types';

const RPC_URL = process.env.SUPRA_RPC_URL!;

export async function getLatestBlockHeight(): Promise<number> {
    const res = await axios.get(`${RPC_URL}/block`);
    return res.data.height;
}

export async function getBlock(height: number): Promise<Block> {
    const res = await axios.get(`${RPC_URL}/blocks/${height}`);
    return res.data;
}