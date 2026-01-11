-- ═══════════════════════════════════════════════════════════════
-- SKULL AGENT - DATABASE SCHEMA
-- Execute this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- System Status Table
CREATE TABLE IF NOT EXISTS system_status (
    id INT PRIMARY KEY DEFAULT 1,
    status TEXT DEFAULT 'OFFLINE',
    wallet_address TEXT,
    balance_sol DECIMAL(20, 9) DEFAULT 0,
    total_pnl DECIMAL(20, 9) DEFAULT 0,
    total_trades INT DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0,
    tokens_scanned INT DEFAULT 0,
    snipes_executed INT DEFAULT 0,
    kills INT DEFAULT 0,
    deaths INT DEFAULT 0,
    sniper_enabled BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default status
INSERT INTO system_status (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Tokens Table
CREATE TABLE IF NOT EXISTS tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ca TEXT UNIQUE NOT NULL,
    nome TEXT,
    simbolo TEXT,
    logo TEXT,
    market_cap DECIMAL(20, 2),
    preco DECIMAL(30, 18),
    holders INT,
    liquidity DECIMAL(20, 2),
    twitter TEXT,
    telegram TEXT,
    website TEXT,
    status TEXT DEFAULT 'detected',
    score INT DEFAULT 0,
    reject_reason TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Trades Table
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id TEXT REFERENCES tokens(ca),
    tipo TEXT NOT NULL,
    valor_sol DECIMAL(20, 9),
    preco DECIMAL(30, 18),
    pnl_sol DECIMAL(20, 9),
    tx_signature TEXT,
    data TIMESTAMPTZ DEFAULT NOW()
);

-- Positions Table
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id TEXT REFERENCES tokens(ca),
    status TEXT DEFAULT 'open',
    valor_sol DECIMAL(20, 9),
    entry_price DECIMAL(30, 18),
    current_price DECIMAL(30, 18),
    pnl_percent DECIMAL(10, 2),
    pnl_sol DECIMAL(20, 9),
    aberto_em TIMESTAMPTZ DEFAULT NOW(),
    fechado_em TIMESTAMPTZ
);

-- Sniper Logs Table
CREATE TABLE IF NOT EXISTS sniper_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    ca TEXT,
    name TEXT,
    symbol TEXT,
    reason TEXT,
    score INT,
    mcap DECIMAL(20, 2),
    liquidity DECIMAL(20, 2),
    amount DECIMAL(20, 9),
    pnl_percent DECIMAL(10, 2),
    tx_signature TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_tokens_ca ON tokens(ca);
CREATE INDEX IF NOT EXISTS idx_tokens_status ON tokens(status);
CREATE INDEX IF NOT EXISTS idx_tokens_criado_em ON tokens(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_trades_data ON trades(data DESC);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_sniper_logs_timestamp ON sniper_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sniper_logs_action ON sniper_logs(action);
