import 'dotenv/config';

// ═══════════════════════════════════════════════════════════════
// SKULL AGENT - CONFIGURACOES
// ═══════════════════════════════════════════════════════════════

export const config = {
    // PumpPortal
    PUMPPORTAL_WS: 'wss://pumpportal.fun/api/data',
    PUMPPORTAL_TRADE: 'https://pumpportal.fun/api/trade-local',

    // Birdeye (API fixa)
    BIRDEYE_API_KEY: '80bb5e77eee64d2481444ca6fcce2d2e',
    BIRDEYE_META: 'https://public-api.birdeye.so/defi/v3/token/meta-data/multiple',
    BIRDEYE_MARKET: 'https://public-api.birdeye.so/defi/v3/token/market-data/multiple',
    BIRDEYE_OVERVIEW: 'https://public-api.birdeye.so/defi/token_overview',
    BIRDEYE_PRICE: 'https://public-api.birdeye.so/defi/price',

    // Helius (API fixa)
    HELIUS_API_KEY: 'ba91df2b-443f-46dc-b3bb-9d185bb9bb0c',
    HELIUS_RPC: 'https://mainnet.helius-rpc.com/?api-key=ba91df2b-443f-46dc-b3bb-9d185bb9bb0c',

    // Supabase (do .env)
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,

    // Wallet (do .env)
    WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY,

    // Server
    PORT: parseInt(process.env.PORT) || 3001,

    // Sniper Config
    SNIPER: {
        MIN_LIQUIDITY: 1000,        // USD minimo de liquidez
        MAX_MCAP: 50000,            // Market cap maximo para snipar
        BUY_AMOUNT_SOL: 0.1,        // Quantidade de SOL por snipe
        SLIPPAGE: 15,               // Slippage %
        AUTO_SELL_PROFIT: 100,      // Vender quando +100%
        STOP_LOSS: -50,             // Vender quando -50%
        ENABLED: process.env.SNIPER_ENABLED === 'true'
    }
};

// ═══════════════════════════════════════════════════════════════
// VALIDACAO
// ═══════════════════════════════════════════════════════════════

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = required.filter(k => !process.env[k]);

if (missing.length > 0) {
    console.error('');
    console.error('☠️  SKULL AGENT ERROR - Variaveis faltando:');
    missing.forEach(k => console.error(`   💀 ${k}`));
    console.error('');
    console.error('   Copie .env.example para .env e preencha!');
    console.error('');
    process.exit(1);
}
