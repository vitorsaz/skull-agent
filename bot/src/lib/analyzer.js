import { config } from '../config.js';
import { getTokenInfo, getSolPrice } from './birdeye.js';

// ═══════════════════════════════════════════════════════════════
// SKULL AGENT - TOKEN ANALYZER
// Sistema de analise e scoring de tokens
// ═══════════════════════════════════════════════════════════════

// Criterios de analise
const ANALYSIS_CRITERIA = {
    // Liquidez
    LIQUIDITY: {
        EXCELLENT: 10000,  // > $10k = excelente
        GOOD: 5000,        // > $5k = bom
        MINIMUM: 1000,     // > $1k = minimo
        WEIGHT: 25
    },
    // Market Cap
    MCAP: {
        SWEET_SPOT_MIN: 5000,   // $5k-$30k = sweet spot
        SWEET_SPOT_MAX: 30000,
        MAX_ALLOWED: 100000,    // Max $100k
        WEIGHT: 25
    },
    // Holders
    HOLDERS: {
        EXCELLENT: 100,
        GOOD: 50,
        MINIMUM: 10,
        WEIGHT: 15
    },
    // Dev Activity (se dev vendeu tudo = ruim)
    DEV_SOLD: {
        WEIGHT: 20
    },
    // Token Age (muito novo = mais arriscado mas mais upside)
    AGE: {
        WEIGHT: 15
    }
};

// ═══════════════════════════════════════════════════════════════
// FUNCOES DE SCORING
// ═══════════════════════════════════════════════════════════════

function scoreLiquidity(liquidity) {
    if (!liquidity || liquidity <= 0) return 0;

    if (liquidity >= ANALYSIS_CRITERIA.LIQUIDITY.EXCELLENT) return 100;
    if (liquidity >= ANALYSIS_CRITERIA.LIQUIDITY.GOOD) return 75;
    if (liquidity >= ANALYSIS_CRITERIA.LIQUIDITY.MINIMUM) return 50;
    return 25;
}

function scoreMcap(mcap) {
    if (!mcap || mcap <= 0) return 0;

    const { SWEET_SPOT_MIN, SWEET_SPOT_MAX, MAX_ALLOWED } = ANALYSIS_CRITERIA.MCAP;

    // Sweet spot = melhor score
    if (mcap >= SWEET_SPOT_MIN && mcap <= SWEET_SPOT_MAX) return 100;

    // Abaixo do sweet spot = bom potencial mas arriscado
    if (mcap < SWEET_SPOT_MIN) return 80;

    // Acima do sweet spot mas abaixo do max
    if (mcap <= MAX_ALLOWED) return 60;

    // Muito alto
    return 20;
}

function scoreHolders(holders) {
    if (!holders || holders <= 0) return 0;

    if (holders >= ANALYSIS_CRITERIA.HOLDERS.EXCELLENT) return 100;
    if (holders >= ANALYSIS_CRITERIA.HOLDERS.GOOD) return 75;
    if (holders >= ANALYSIS_CRITERIA.HOLDERS.MINIMUM) return 50;
    return 25;
}

function scoreAge(createdAt) {
    if (!createdAt) return 50; // Se nao sabe, score neutro

    const ageMinutes = (Date.now() - new Date(createdAt).getTime()) / 60000;

    // Muito novo (< 5 min) = alto risco mas alto potencial
    if (ageMinutes < 5) return 90;

    // Novo (< 30 min) = bom timing
    if (ageMinutes < 30) return 80;

    // < 1 hora = ok
    if (ageMinutes < 60) return 60;

    // < 4 horas = pode ter perdido o pump
    if (ageMinutes < 240) return 40;

    // Velho demais
    return 20;
}

// ═══════════════════════════════════════════════════════════════
// ANALISE COMPLETA
// ═══════════════════════════════════════════════════════════════

export async function analyzeToken(ca, pumpData = {}) {
    const analysis = {
        ca,
        timestamp: new Date().toISOString(),
        scores: {},
        totalScore: 0,
        verdict: 'ANALYZING',
        reasons: [],
        risks: [],
        opportunities: []
    };

    try {
        // Buscar dados do token
        const tokenInfo = await getTokenInfo(ca);
        const solPrice = await getSolPrice();

        // Dados do pump.fun
        const mcapFromPump = (pumpData.marketCapSol || 0) * solPrice;

        // Usar dados disponiveis
        const liquidity = tokenInfo?.liquidity || pumpData.vSolInBondingCurve * solPrice || 0;
        const mcap = mcapFromPump > 0 ? mcapFromPump : (tokenInfo?.mc || 0);
        const holders = tokenInfo?.holders || 0;

        // Calcular scores individuais
        analysis.scores = {
            liquidity: {
                value: liquidity,
                score: scoreLiquidity(liquidity),
                weight: ANALYSIS_CRITERIA.LIQUIDITY.WEIGHT
            },
            mcap: {
                value: mcap,
                score: scoreMcap(mcap),
                weight: ANALYSIS_CRITERIA.MCAP.WEIGHT
            },
            holders: {
                value: holders,
                score: scoreHolders(holders),
                weight: ANALYSIS_CRITERIA.HOLDERS.WEIGHT
            },
            age: {
                value: pumpData.timestamp || null,
                score: scoreAge(pumpData.timestamp),
                weight: ANALYSIS_CRITERIA.AGE.WEIGHT
            }
        };

        // Calcular score total ponderado
        let totalWeight = 0;
        let weightedScore = 0;

        for (const [key, data] of Object.entries(analysis.scores)) {
            weightedScore += data.score * data.weight;
            totalWeight += data.weight;
        }

        analysis.totalScore = Math.round(weightedScore / totalWeight);

        // Identificar riscos
        if (liquidity < ANALYSIS_CRITERIA.LIQUIDITY.MINIMUM) {
            analysis.risks.push('LOW_LIQUIDITY');
        }
        if (mcap > ANALYSIS_CRITERIA.MCAP.MAX_ALLOWED) {
            analysis.risks.push('HIGH_MCAP');
        }
        if (holders < ANALYSIS_CRITERIA.HOLDERS.MINIMUM) {
            analysis.risks.push('FEW_HOLDERS');
        }

        // Identificar oportunidades
        if (mcap >= ANALYSIS_CRITERIA.MCAP.SWEET_SPOT_MIN &&
            mcap <= ANALYSIS_CRITERIA.MCAP.SWEET_SPOT_MAX) {
            analysis.opportunities.push('SWEET_SPOT_MCAP');
        }
        if (liquidity >= ANALYSIS_CRITERIA.LIQUIDITY.EXCELLENT) {
            analysis.opportunities.push('HIGH_LIQUIDITY');
        }
        if (holders >= ANALYSIS_CRITERIA.HOLDERS.EXCELLENT) {
            analysis.opportunities.push('MANY_HOLDERS');
        }

        // Determinar veredito
        if (analysis.totalScore >= 80) {
            analysis.verdict = 'EXCELLENT';
            analysis.shouldSnipe = true;
            analysis.reasons.push('High score across all metrics');
        } else if (analysis.totalScore >= 65) {
            analysis.verdict = 'GOOD';
            analysis.shouldSnipe = true;
            analysis.reasons.push('Good potential with acceptable risk');
        } else if (analysis.totalScore >= 50) {
            analysis.verdict = 'RISKY';
            analysis.shouldSnipe = false;
            analysis.reasons.push('Medium score - proceed with caution');
        } else {
            analysis.verdict = 'AVOID';
            analysis.shouldSnipe = false;
            analysis.reasons.push('Low score - too risky');
        }

        // Adicionar info do token
        analysis.tokenInfo = {
            name: pumpData.name || tokenInfo?.name || 'Unknown',
            symbol: pumpData.symbol || tokenInfo?.symbol || '???',
            logo: tokenInfo?.logo || null,
            liquidity,
            mcap,
            holders,
            price: tokenInfo?.price || 0
        };

        // Override se criterios minimos nao forem atingidos
        if (liquidity < config.SNIPER.MIN_LIQUIDITY) {
            analysis.shouldSnipe = false;
            analysis.verdict = 'REJECTED';
            analysis.reasons = ['Liquidity below minimum threshold'];
        }

        if (mcap > config.SNIPER.MAX_MCAP) {
            analysis.shouldSnipe = false;
            analysis.verdict = 'REJECTED';
            analysis.reasons = ['Market cap above maximum threshold'];
        }

    } catch (error) {
        console.error('[ANALYZER] Error:', error.message);
        analysis.verdict = 'ERROR';
        analysis.shouldSnipe = false;
        analysis.reasons = ['Analysis failed: ' + error.message];
    }

    return analysis;
}

// ═══════════════════════════════════════════════════════════════
// FORMATADORES
// ═══════════════════════════════════════════════════════════════

export function getVerdictEmoji(verdict) {
    switch (verdict) {
        case 'EXCELLENT': return '🟢';
        case 'GOOD': return '🟡';
        case 'RISKY': return '🟠';
        case 'AVOID': return '🔴';
        case 'REJECTED': return '⛔';
        case 'ERROR': return '❌';
        default: return '⚪';
    }
}

export function getVerdictColor(verdict) {
    switch (verdict) {
        case 'EXCELLENT': return '#00ff41';
        case 'GOOD': return '#ffff00';
        case 'RISKY': return '#ff8800';
        case 'AVOID': return '#ff0000';
        case 'REJECTED': return '#8B0000';
        case 'ERROR': return '#ff0000';
        default: return '#888888';
    }
}

export function formatAnalysisLog(analysis) {
    const emoji = getVerdictEmoji(analysis.verdict);
    const { tokenInfo, totalScore, risks, opportunities } = analysis;

    let log = `
╔══════════════════════════════════════════════════════════════╗
║ ${emoji} ${analysis.verdict.padEnd(10)} | Score: ${totalScore}/100 | ${tokenInfo.symbol}
╠══════════════════════════════════════════════════════════════╣
║ Name: ${tokenInfo.name.slice(0, 30)}
║ CA: ${analysis.ca}
╠══════════════════════════════════════════════════════════════╣
║ Liquidity: $${tokenInfo.liquidity.toLocaleString()} (${analysis.scores.liquidity.score}/100)
║ MCap: $${tokenInfo.mcap.toLocaleString()} (${analysis.scores.mcap.score}/100)
║ Holders: ${tokenInfo.holders} (${analysis.scores.holders.score}/100)
╠══════════════════════════════════════════════════════════════╣`;

    if (risks.length > 0) {
        log += `\n║ ⚠️  Risks: ${risks.join(', ')}`;
    }
    if (opportunities.length > 0) {
        log += `\n║ ✨ Opportunities: ${opportunities.join(', ')}`;
    }

    log += `
╠══════════════════════════════════════════════════════════════╣
║ Decision: ${analysis.shouldSnipe ? '🎯 SNIPE' : '🚫 SKIP'}
╚══════════════════════════════════════════════════════════════╝`;

    return log;
}
