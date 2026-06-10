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