-- Tabela de controlo do indexador
CREATE TABLE IF NOT EXISTS indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_processed_height BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de transações (com hash)
CREATE TABLE IF NOT EXISTS transactions (
    txn_hash VARCHAR(66) PRIMARY KEY,
    block_height BIGINT NOT NULL,
    success BOOLEAN,
    vm_status TEXT,
    timestamp BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de eventos genéricos (dados crus)
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    txn_hash VARCHAR(66) REFERENCES transactions(txn_hash),
    protocol VARCHAR(50),
    event_type VARCHAR(100),
    event_data JSONB,
    block_height BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela normalizada para swaps (facilita queries)
CREATE TABLE IF NOT EXISTS dex_swaps (
    id SERIAL PRIMARY KEY,
    txn_hash VARCHAR(66) REFERENCES transactions(txn_hash),
    protocol VARCHAR(50),
    pair_x TEXT,
    pair_y TEXT,
    amount_x_in NUMERIC,
    amount_x_out NUMERIC,
    amount_y_in NUMERIC,
    amount_y_out NUMERIC,
    timestamp BIGINT,
    block_height BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para desempenho
CREATE INDEX IF NOT EXISTS idx_txn_block_height ON transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_events_txn_hash ON events(txn_hash);
CREATE INDEX IF NOT EXISTS idx_swaps_txn_hash ON dex_swaps(txn_hash);
CREATE INDEX IF NOT EXISTS idx_swaps_pair_x ON dex_swaps(pair_x);
CREATE INDEX IF NOT EXISTS idx_swaps_pair_y ON dex_swaps(pair_y);