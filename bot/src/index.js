import './lib/utils.js';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { supabase, updateSystemStatus, upsertToken, recordTrade, createPosition, getOpenPositions, closePosition, logSniperAction, getRecentTokens, getSniperLogs } from './lib/supabase.js';
import { getTokenInfo, getSolPrice, analyzeForSnipe } from './lib/birdeye.js';
import { fetchImageFromIPFS, printSkull, printKill, formatMarketCap, sleep } from './lib/utils.js';
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
// SKULL AGENT - SNIPER BOT
// ═══════════════════════════════════════════════════════════════

let stats = {
    tokensScanned: 0,
    snipesExecuted: 0,
    kills: 0,
    deaths: 0,
    totalPnl: 0
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
    console.log(`[API] ☠️ Skull API em http://localhost:${config.PORT}`);
});

// ═══════════════════════════════════════════════════════════════
// PROCESSAR NOVO TOKEN
// ═══════════════════════════════════════════════════════════════

async function processNewToken(msg) {
    const { mint: ca, name, symbol, uri, marketCapSol } = msg;
    stats.tokensScanned++;

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║ 💀 NOVO ALVO DETECTADO                                     ║`);
    console.log(`║ ${(name || 'Unknown').slice(0, 30).padEnd(30)} (${(symbol || '???').slice(0, 6).padEnd(6)}) ║`);
    console.log(`║ CA: ${ca.slice(0, 20)}...${ca.slice(-8)}                  ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');

    // Salvar token no banco
    await upsertToken({
        ca,
        nome: name || 'Unknown',
        simbolo: symbol || '???',
        status: 'scanning'
    });

    // Log da acao
    await logSniperAction({
        action: 'DETECTED',
        ca,
        name: name || 'Unknown',
        symbol: symbol || '???'
    });

    // Buscar logo
    let logo = null;
    if (uri) {
        logo = await fetchImageFromIPFS(uri);
    }

    // Analisar para snipe
    console.log('[SKULL] 🔍 Analisando alvo...');
    await sleep(2000); // Esperar dados de mercado

    const analysis = await analyzeForSnipe(ca);

    // Calcular market cap
    const solPrice = await getSolPrice();
    const mcapFromPump = (marketCapSol || 0) * solPrice;
    const mcap = mcapFromPump > 0 ? mcapFromPump : (analysis.info?.mc || 0);

    // Atualizar token
    await upsertToken({
        ca,
        nome: name || analysis.info?.name || 'Unknown',
        simbolo: symbol || analysis.info?.symbol || '???',
        logo: logo || analysis.info?.logo || null,
        market_cap: mcap,
        preco: analysis.info?.price || 0,
        holders: analysis.info?.holders || 0,
        liquidity: analysis.info?.liquidity || 0,
        status: analysis.shouldSnipe ? 'approved' : 'rejected',
        score: analysis.score || 0,
        reject_reason: analysis.reason !== 'APPROVED' ? analysis.reason : null
    });

    // Log analise
    await logSniperAction({
        action: analysis.shouldSnipe ? 'APPROVED' : 'REJECTED',
        ca,
        name: name || 'Unknown',
        symbol: symbol || '???',
        reason: analysis.reason,
        score: analysis.score,
        mcap,
        liquidity: analysis.info?.liquidity || 0
    });

    console.log(`[SKULL] ${analysis.shouldSnipe ? '✅ APROVADO' : '❌ REJEITADO'} - ${analysis.reason}`);
    if (analysis.score) console.log(`[SKULL] Score: ${analysis.score}/100`);

    // EXECUTAR SNIPE se aprovado e habilitado
    if (analysis.shouldSnipe && config.SNIPER.ENABLED && getWallet()) {
        console.log('[SKULL] 🎯 EXECUTANDO SNIPE...');

        await logSniperAction({
            action: 'SNIPING',
            ca,
            amount: config.SNIPER.BUY_AMOUNT_SOL
        });

        const tx = await snipeToken(ca, config.SNIPER.BUY_AMOUNT_SOL, config.SNIPER.SLIPPAGE);

        if (tx) {
            stats.snipesExecuted++;

            // Registrar trade
            await recordTrade({
                token_id: ca,
                tipo: 'buy',
                valor_sol: config.SNIPER.BUY_AMOUNT_SOL,
                preco: analysis.info?.price || 0,
                tx_signature: tx
            });

            // Criar posicao
            await createPosition({
                token_id: ca,
                valor_sol: config.SNIPER.BUY_AMOUNT_SOL,
                entry_price: analysis.info?.price || 0,
                status: 'open'
            });

            // Monitorar token
            subscribeToken(ca);

            await logSniperAction({
                action: 'SNIPE_SUCCESS',
                ca,
                tx_signature: tx
            });

            console.log('[SKULL] 🩸 KILL CONFIRMADO!');
        } else {
            await logSniperAction({
                action: 'SNIPE_FAILED',
                ca
            });
        }
    }

    return analysis;
}

// ═══════════════════════════════════════════════════════════════
// MONITORAR POSICOES (auto sell)
// ═══════════════════════════════════════════════════════════════

async function monitorPositions() {
    const positions = await getOpenPositions();

    for (const pos of positions) {
        try {
            const info = await getTokenInfo(pos.token_id);
            if (!info || !info.price) continue;

            const currentValue = info.price;
            const entryPrice = pos.entry_price;
            const pnlPercent = ((currentValue - entryPrice) / entryPrice) * 100;

            // Atualizar posicao
            await supabase
                .from('positions')
                .update({
                    current_price: currentValue,
                    pnl_percent: pnlPercent
                })
                .eq('id', pos.id);

            // Auto sell em profit
            if (pnlPercent >= config.SNIPER.AUTO_SELL_PROFIT) {
                console.log(`[SKULL] 🩸 TAKE PROFIT - ${pos.tokens?.simbolo} +${pnlPercent.toFixed(2)}%`);

                const tx = await dumpToken(pos.token_id, 100);
                if (tx) {
                    stats.kills++;
                    stats.totalPnl += pnlPercent;
                    await closePosition(pos.id, pnlPercent);
                    printKill(pos.tokens?.nome || 'Unknown', pos.tokens?.simbolo || '???', pnlPercent);

                    await logSniperAction({
                        action: 'TAKE_PROFIT',
                        ca: pos.token_id,
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
                        pnl_percent: pnlPercent,
                        tx_signature: tx
                    });
                }
            }
        } catch (e) {
            console.error(`[MONITOR] Erro em ${pos.token_id}:`, e.message);
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
    console.log('║           ☠️  SKULL AGENT - INICIANDO  ☠️                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    // Carregar wallet
    const wallet = loadWallet();
    if (wallet) {
        const balance = await getBalance();
        console.log(`[SKULL] 💰 Balance: ${balance.toFixed(4)} SOL`);
    }

    // Status inicial
    await updateSystemStatus({
        status: 'STARTING',
        wallet_address: wallet?.publicKey.toBase58() || null,
        balance_sol: wallet ? await getBalance() : 0,
        sniper_enabled: config.SNIPER.ENABLED
    });

    // Conectar WebSocket
    connectPumpPortal({
        onConnect: async () => {
            await updateSystemStatus({ status: 'HUNTING' });
            subscribeNewTokens();
            console.log('');
            console.log('[SKULL] ☠️ MODO CACA ATIVADO');
            console.log(`[SKULL] 🎯 Sniper: ${config.SNIPER.ENABLED ? 'LIGADO' : 'DESLIGADO'}`);
            console.log(`[SKULL] 💰 Buy amount: ${config.SNIPER.BUY_AMOUNT_SOL} SOL`);
            console.log(`[SKULL] 📈 Take profit: +${config.SNIPER.AUTO_SELL_PROFIT}%`);
            console.log(`[SKULL] 📉 Stop loss: ${config.SNIPER.STOP_LOSS}%`);
            console.log('');
        },
        onDisconnect: async () => {
            await updateSystemStatus({ status: 'OFFLINE' });
        },
        onToken: processNewToken
    });

    // Atualizar balance periodicamente
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

    // Monitorar posicoes abertas
    setInterval(monitorPositions, 15000);
}

main().catch(console.error);
