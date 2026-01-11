import { config } from '../config.js';

const HEADERS = {
    'X-API-KEY': config.BIRDEYE_API_KEY,
    'x-chain': 'solana'
};

// ═══════════════════════════════════════════════════════════════
// CACHE DE PRECO SOL
// ═══════════════════════════════════════════════════════════════

let solPriceUsd = 0;
let solPriceLastUpdate = 0;

export async function getSolPrice() {
    const now = Date.now();

    if (solPriceUsd > 0 && now - solPriceLastUpdate < 60000) {
        return solPriceUsd;
    }

    try {
        const r = await fetch(
            `${config.BIRDEYE_PRICE}?address=So11111111111111111111111111111111111111112`,
            { headers: HEADERS }
        );
        const json = await r.json();

        if (json.success && json.data?.value) {
            solPriceUsd = json.data.value;
            solPriceLastUpdate = now;
            return solPriceUsd;
        }
    } catch (e) {
        console.error('[BIRDEYE] SOL price error:', e.message);
    }

    return solPriceUsd > 0 ? solPriceUsd : 200;
}

// ═══════════════════════════════════════════════════════════════
// METADATA
// ═══════════════════════════════════════════════════════════════

export async function getTokenMetadata(ca) {
    try {
        const url = `${config.BIRDEYE_META}?list_address=${ca}`;
        const r = await fetch(url, { headers: HEADERS });
        const json = await r.json();

        if (json.success && json.data?.[ca]) {
            const d = json.data[ca];
            return {
                name: d.name,
                symbol: d.symbol,
                logo: d.logo_uri,
                decimals: d.decimals
            };
        }
        return null;
    } catch (e) {
        console.error('[BIRDEYE] Metadata error:', e.message);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// MARKET DATA
// ═══════════════════════════════════════════════════════════════

export async function getTokenMarket(ca) {
    try {
        const url = `${config.BIRDEYE_MARKET}?list_address=${ca}`;
        const r = await fetch(url, { headers: HEADERS });
        const json = await r.json();

        if (json.success && json.data?.[ca]) {
            const d = json.data[ca];
            return {
                price: d.price || 0,
                mc: d.marketCap || d.realMc || 0,
                liquidity: d.liquidity || 0,
                volume24h: d.v24hUSD || 0,
                change24h: d.v24hChangePercent || 0,
                holders: d.holder || 0
            };
        }
        return null;
    } catch (e) {
        console.error('[BIRDEYE] Market error:', e.message);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// TOKEN INFO COMPLETO
// ═══════════════════════════════════════════════════════════════

export async function getTokenInfo(ca) {
    const [metadata, market] = await Promise.all([
        getTokenMetadata(ca),
        getTokenMarket(ca)
    ]);

    if (!metadata && !market) return null;

    return {
        name: metadata?.name || 'Unknown',
        symbol: metadata?.symbol || '???',
        logo: metadata?.logo || null,
        decimals: metadata?.decimals || 9,
        price: market?.price || 0,
        mc: market?.mc || 0,
        liquidity: market?.liquidity || 0,
        volume24h: market?.volume24h || 0,
        change24h: market?.change24h || 0,
        holders: market?.holders || 0
    };
}

// ═══════════════════════════════════════════════════════════════
// SNIPER ANALYSIS
// ═══════════════════════════════════════════════════════════════

export async function analyzeForSnipe(ca) {
    const info = await getTokenInfo(ca);
    if (!info) return { shouldSnipe: false, reason: 'NO_DATA' };

    const { mc, liquidity, holders } = info;

    // Criterios do SKULL AGENT
    if (liquidity < config.SNIPER.MIN_LIQUIDITY) {
        return { shouldSnipe: false, reason: 'LOW_LIQUIDITY', info };
    }

    if (mc > config.SNIPER.MAX_MCAP) {
        return { shouldSnipe: false, reason: 'HIGH_MCAP', info };
    }

    // Token aprovado para snipe
    return {
        shouldSnipe: true,
        reason: 'APPROVED',
        info,
        score: calculateScore(info)
    };
}

function calculateScore(info) {
    let score = 50;

    // Liquidez boa = +pontos
    if (info.liquidity > 5000) score += 15;
    if (info.liquidity > 10000) score += 10;

    // Market cap baixo = oportunidade
    if (info.mc < 10000) score += 20;
    if (info.mc < 5000) score += 10;

    // Muitos holders rapido = hype
    if (info.holders > 50) score += 10;
    if (info.holders > 100) score += 5;

    return Math.min(100, score);
}
