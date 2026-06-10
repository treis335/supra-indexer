import fs from 'fs';
import path from 'path';
import { ProtocolConfig } from './types';

const configPath = path.resolve(__dirname, '../config.json');
const raw = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(raw);

export const protocols: ProtocolConfig[] = config.protocols;