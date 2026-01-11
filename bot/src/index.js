import './lib/utils.js';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { supabase, updateSystemStatus, upsertToken, recordTrade, createPosition, getOpenPositions, closePosition, logSniperAction, getRecentTokens, getSniperLogs } from './lib/supabase.js';
import { getTokenInfo, getSolPrice } from './lib/birdeye.js';
import { fetchImageFromIPFS, printSkull, formatMarketCap, sleep } from './lib/utils.js';
import { analyzeToken, getVerdictEmoji, formatAnalysisLog } from './lib/analyzer.js';
import {
    loadWallet,
    getWallet,
    getBalance,
    connectPumpPortal,
    subscribeNewTokens,
    subscribeToken,
    isWsConnected,
    snipeToken,
    dumpToken
} from './lib/pumpportal.js';

// ═══════════════════════════════════════════════════════════════
// SKULL AGENT - SNIPER BOT v2.0
// ═══════════════════════════════════════════════════════════════

let stats = {
    tokensScanned: 0,
    snipesExecuted: 0,
    kills: 0,
    deaths: 0,
    totalPnl: 0,
    lastToken: null
};

// ═══════════════════════════════════════════════════════════════
// EXPRESS API
// ═══════════════════════════════════════════════════════════════

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
    const wallet = getWallet();
    const balance = await getBalance();
    res.json({
        status: 'alive',
        skull: 'hunting',
        connected: isWsConnected(),
        wallet: wallet?.publicKey.toBase58() || null,
        balance,
        stats,
        uptime: process.uptime()
    });
});

// Status completo
app.get('/status', async (req, res) => {
    const wallet = getWallet();
    const positions = await getOpenPositions();
    const logs = await getSniperLogs(20);
    res.json({
        online: isWsConnected(),
        wallet: wallet?.publicKey.toBase58() || null,
        balance: await getBalance(),
        sniperEnabled: config.SNIPER.ENABLED,
        stats,
        openPositions: positions.length,
        positions,
        recentLogs: logs
    });
});

// Tokens recentes
app.get('/tokens', async (req, res) => {
    const tokens = await getRecentTokens(50);
    res.json(tokens);
});

// Token especifico por CA
app.get('/token/:ca', async (req, res) => {
    const { ca } = req.params;
    const { data } = await supabase
        .from('tokens')
        .select('*')
        .eq('ca', ca)
        .single();

    if (!data) {
        return res.status(404).json({ error: 'Token not found' });
    }

    // Buscar logs relacionados
    const { data: logs } = await supabase
        .from('sniper_logs')
        .select('*')
        .eq('ca', ca)
        .order('timestamp', { ascending: false })
        .limit(20);

    res.json({ token: data, logs: logs || [] });
});

// Analisar token manualmente
app.post('/analyze', async (req, res) => {
    const { ca } = req.body;
    if (!ca) {
        return res.status(400).json({ error: 'CA required' });
    }

    const analysis = await analyzeToken(ca, {});
    res.json(analysis);
});

// Logs do sniper
app.get('/logs', async (req, res) => {
    const logs = await getSniperLogs(100);
    res.json(logs);
});

// Snipe manual
app.post('/snipe', async (req, res) => {
    const { ca, amount } = req.body;
    const tx = await snipeToken(ca, amount || config.SNIPER.BUY_AMOUNT_SOL);
    res.json({ success: !!tx, signature: tx });
});

// Dump manual
app.post('/dump', async (req, res) => {
    const { ca, percent } = req.body;
    const tx = await dumpToken(ca, percent || 100);
    res.json({ success: !!tx, signature: tx });
});

// Toggle sniper
app.post('/toggle-sniper', (req, res) => {
    config.SNIPER.ENABLED = !config.SNIPER.ENABLED;
    console.log(`[SKULL] Sniper ${config.SNIPER.ENABLED ? 'ATIVADO' : 'DESATIVADO'}`);
    res.json({ enabled: config.SNIPER.ENABLED });
});

app.listen(config.PORT, () => {
    console.log(`[API] SKULL API em http://localhost:${config.PORT}`);
});

// ═══════════════════════════════════════════════════════════════
// PROCESSAR NOVO TOKEN
// ═══════════════════════════════════════════════════════════════

async function processNewToken(msg) {
    const { mint: ca, name, symbol, uri, marketCapSol, vSolInBondingCurve } = msg;
    stats.tokensScanned++;
    stats.lastToken = { ca, name, symbol, time: new Date().toISOString() };

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║ 💀 NOVO ALVO #${stats.tokensScanned}`.padEnd(61) + '║');
    console.log(`║ ${(name || 'Unknown').slice(0, 30).padEnd(30)} (${(symbol || '???').slice(0, 8).padEnd(8)})`.padEnd(61) + '║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    // Salvar token inicial
    await upsertToken({
        ca,
        nome: name || 'Unknown',
        simbolo: symbol || '???',
        status: 'scanning'
    });

    // Log deteccao
    await logSniperAction({
        action: 'DETECTED',
        ca,
        name: name || 'Unknown',
        symbol: symbol || '???'
    });

    // Aguardar um pouco para dados de mercado
    await sleep(1500);

    // ANALISE COMPLETA
    console.log('[SKULL] Analisando alvo...');
    const analysis = await analyzeToken(ca, {
        name,
        symbol,
        marketCapSol,
        vSolInBondingCurve,
        timestamp: new Date().toISOString()
    });

    // Log analise formatada
    console.log(formatAnalysisLog(analysis));

    // Buscar logo
    let logo = null;
    if (uri) {
        logo = await fetchImageFromIPFS(uri);
    }

    // Atualizar token no banco com analise completa
    await upsertToken({
        ca,
        nome: analysis.tokenInfo.name,
        simbolo: analysis.tokenInfo.symbol,
        logo: logo || analysis.tokenInfo.logo,
        market_cap: analysis.tokenInfo.mcap,
        preco: analysis.tokenInfo.price,
        holders: analysis.tokenInfo.holders,
        liquidity: analysis.tokenInfo.liquidity,
        status: analysis.verdict.toLowerCase(),
        score: analysis.totalScore,
        reject_reason: !analysis.shouldSnipe ? analysis.reasons.join(', ') : null
    });

    // Log resultado da analise
    await logSniperAction({
        action: analysis.shouldSnipe ? 'APPROVED' : 'REJECTED',
        ca,
        name: analysis.tokenInfo.name,
        symbol: analysis.tokenInfo.symbol,
        reason: analysis.reasons.join(', '),
        score: analysis.totalScore,
        mcap: analysis.tokenInfo.mcap,
        liquidity: analysis.tokenInfo.liquidity
    });

    // EXECUTAR SNIPE se aprovado
    if (analysis.shouldSnipe && config.SNIPER.ENABLED && getWallet()) {
        console.log('[SKULL] 🎯 EXECUTANDO SNIPE...');

        await logSniperAction({
            action: 'SNIPING',
            ca,
            name: analysis.tokenInfo.name,
            symbol: analysis.tokenInfo.symbol,
            amount: config.SNIPER.BUY_AMOUNT_SOL
        });

        const tx = await snipeToken(ca, config.SNIPER.BUY_AMOUNT_SOL, config.SNIPER.SLIPPAGE);

        if (tx) {
            stats.snipesExecuted++;

            await recordTrade({
                token_id: ca,
                tipo: 'buy',
                valor_sol: config.SNIPER.BUY_AMOUNT_SOL,
                preco: analysis.tokenInfo.price,
                tx_signature: tx
            });

            await createPosition({
                token_id: ca,
                valor_sol: config.SNIPER.BUY_AMOUNT_SOL,
                entry_price: analysis.tokenInfo.price,
                status: 'open'
            });

            await upsertToken({ ca, status: 'sniped' });

            subscribeToken(ca);

            await logSniperAction({
                action: 'SNIPE_SUCCESS',
                ca,
                name: analysis.tokenInfo.name,
                symbol: analysis.tokenInfo.symbol,
                tx_signature: tx
            });

            console.log('[SKULL] 🩸 KILL CONFIRMADO!');
        } else {
            await logSniperAction({
                action: 'SNIPE_FAILED',
                ca,
                name: analysis.tokenInfo.name,
                symbol: analysis.tokenInfo.symbol
            });
            console.log('[SKULL] ❌ Snipe falhou');
        }
    }

    return analysis;
}

// ═══════════════════════════════════════════════════════════════
// MONITORAR POSICOES
// ═══════════════════════════════════════════════════════════════

async function monitorPositions() {
    const positions = await getOpenPositions();

    for (const pos of positions) {
        try {
            const info = await getTokenInfo(pos.token_id);
            if (!info || !info.price) continue;

            const currentValue = info.price;
            const entryPrice = pos.entry_price;

            if (!entryPrice || entryPrice === 0) continue;

            const pnlPercent = ((currentValue - entryPrice) / entryPrice) * 100;

            await supabase
                .from('positions')
                .update({
                    current_price: currentValue,
                    pnl_percent: pnlPercent
                })
                .eq('id', pos.id);

            // Take profit
            if (pnlPercent >= config.SNIPER.AUTO_SELL_PROFIT) {
                console.log(`[SKULL] 🩸 TAKE PROFIT - ${pos.tokens?.simbolo} +${pnlPercent.toFixed(2)}%`);

                const tx = await dumpToken(pos.token_id, 100);
                if (tx) {
                    stats.kills++;
                    stats.totalPnl += pnlPercent;
                    await closePosition(pos.id, pnlPercent);

                    await logSniperAction({
                        action: 'TAKE_PROFIT',
                        ca: pos.token_id,
                        name: pos.tokens?.nome,
                        symbol: pos.tokens?.simbolo,
                        pnl_percent: pnlPercent,
                        tx_signature: tx
                    });
                }
            }

            // Stop loss
            if (pnlPercent <= config.SNIPER.STOP_LOSS) {
                console.log(`[SKULL] 💀 STOP LOSS - ${pos.tokens?.simbolo} ${pnlPercent.toFixed(2)}%`);

                const tx = await dumpToken(pos.token_id, 100);
                if (tx) {
                    stats.deaths++;
                    stats.totalPnl += pnlPercent;
                    await closePosition(pos.id, pnlPercent);

                    await logSniperAction({
                        action: 'STOP_LOSS',
                        ca: pos.token_id,
                        name: pos.tokens?.nome,
                        symbol: pos.tokens?.simbolo,
                        pnl_percent: pnlPercent,
                        tx_signature: tx
                    });
                }
            }
        } catch (e) {
            console.error(`[MONITOR] Erro:`, e.message);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
    printSkull();

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           ☠️  SKULL AGENT v2.0 - INICIANDO  ☠️              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    const wallet = loadWallet();
    if (wallet) {
        const balance = await getBalance();
        console.log(`[SKULL] 💰 Balance: ${balance.toFixed(4)} SOL`);
    }

    await updateSystemStatus({
        status: 'STARTING',
        wallet_address: wallet?.publicKey.toBase58() || null,
        balance_sol: wallet ? await getBalance() : 0,
        sniper_enabled: config.SNIPER.ENABLED
    });

    connectPumpPortal({
        onConnect: async () => {
            await updateSystemStatus({ status: 'HUNTING' });
            subscribeNewTokens();
            console.log('');
            console.log('[SKULL] ☠️ MODO CACA ATIVADO');
            console.log(`[SKULL] 🎯 Sniper: ${config.SNIPER.ENABLED ? 'LIGADO' : 'DESLIGADO'}`);
            console.log(`[SKULL] 💰 Buy: ${config.SNIPER.BUY_AMOUNT_SOL} SOL`);
            console.log(`[SKULL] 📈 TP: +${config.SNIPER.AUTO_SELL_PROFIT}%`);
            console.log(`[SKULL] 📉 SL: ${config.SNIPER.STOP_LOSS}%`);
            console.log(`[SKULL] 💧 Min Liq: $${config.SNIPER.MIN_LIQUIDITY}`);
            console.log(`[SKULL] 📊 Max MCap: $${config.SNIPER.MAX_MCAP}`);
            console.log('');
        },
        onDisconnect: async () => {
            await updateSystemStatus({ status: 'OFFLINE' });
        },
        onToken: processNewToken
    });

    // Atualizar status periodicamente
    setInterval(async () => {
        if (wallet) {
            const balance = await getBalance();
            await updateSystemStatus({
                balance_sol: balance,
                tokens_scanned: stats.tokensScanned,
                snipes_executed: stats.snipesExecuted,
                kills: stats.kills,
                deaths: stats.deaths,
                total_pnl: stats.totalPnl
            });
        }
    }, 30000);

    // Monitorar posicoes
    setInterval(monitorPositions, 15000);
}

main().catch(console.error);
