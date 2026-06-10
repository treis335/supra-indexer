export interface Block {
    height: number;
    transactions: Transaction[];
}

export interface Transaction {
    txn_hash: string;
    success: boolean;
    vm_status: string;
    output: {
        events: Event[];
    };
    timestamp?: number;
}

export interface Event {
    type: string;
    data: any;
    guid?: any;
}

export interface ProtocolConfig {
    name: string;
    contract_address: string;
    event_type: string;
    handler: string;
}

// Estrutura real da Supra Consensus API
export interface SupraConsensusTx {
    hash: string;
    header?: {
        sender?: string;
        sequence_number?: number;
        expiration_timestamp?: { timestamp: number };
    };
    output?: {
        Move?: {
            events: SupraEvent[];
            vm_status?: string;
            gas_used?: number;
        };
    };
    status?: string;
}

export interface SupraEvent {
    type: string;
    data: any;
    guid?: {
        creation_number: string;
        account_address: string;
    };
    sequence_number?: string;
}

export interface SupraConsensusBlock {
    block?: {
        block?: {
            header?: {
                height: number;
                timestamp?: { timestamp: number };
            };
        };
    };
    batches?: Record<string, {
        transactions?: SupraConsensusTx[];
    }>;
}
