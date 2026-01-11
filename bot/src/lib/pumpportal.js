import WebSocket from 'ws';
import { Keypair, Connection, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { config } from '../config.js';

// ═══════════════════════════════════════════════════════════════
// CONEXAO SOLANA
// ═══════════════════════════════════════════════════════════════

const connection = new Connection(config.HELIUS_RPC);
let wallet = null;

// ═══════════════════════════════════════════════════════════════
// WALLET LOADER
// ═══════════════════════════════════════════════════════════════

export function loadWallet() {
    try {
        if (!config.WALLET_PRIVATE_KEY) {
            console.log('[SKULL] ☠️ Nenhuma wallet - modo observador');
            return null;
        }

        const pk = config.WALLET_PRIVATE_KEY.trim();
        let secretKey;

        if (pk.startsWith('[')) {
            secretKey = new Uint8Array(JSON.parse(pk));
        } else {
            secretKey = new Uint8Array(Buffer.from(pk, 'base64'));
        }

        wallet = Keypair.fromSecretKey(secretKey);
        console.log('[SKULL] 💀 Wallet carregada:', wallet.publicKey.toBase58());
        return wallet;
    } catch (e) {
        console.error('[SKULL] Wallet erro:', e.message);
        return null;
    }
}

export function getWallet() {
    return wallet;
}

export async function getBalance() {
    if (!wallet) return 0;
    try {
        const balance = await connection.getBalance(wallet.publicKey);
        return balance / LAMPORTS_PER_SOL;
    } catch (e) {
        console.error('[BALANCE] Erro:', e.message);
        return 0;
    }
}

// ═══════════════════════════════════════════════════════════════
// WEBSOCKET COM RECONNECT
// ═══════════════════════════════════════════════════════════════

let ws = null;
let isConnected = false;
let reconnectAttempts = 0;

export function connectPumpPortal(callbacks = {}) {
    const { onToken, onTrade, onConnect, onDisconnect } = callbacks;

    console.log('[SKULL] ☠️ Conectando ao cemiterio...');
    ws = new WebSocket(config.PUMPPORTAL_WS);

    ws.on('open', () => {
        isConnected = true;
        reconnectAttempts = 0;
        console.log('[SKULL] 💀 ONLINE - Cacando vitimas...');
        if (onConnect) onConnect();
    });

    ws.on('message', async (data) => {
        try {
            const msg = JSON.parse(data.toString());

            if (msg.txType === 'create' && msg.mint && onToken) {
                onToken(msg);
            }

            if ((msg.txType === 'buy' || msg.txType === 'sell') && onTrade) {
                onTrade(msg);
            }
        } catch {}
    });

    ws.on('close', () => {
        isConnected = false;
        reconnectAttempts++;
        const delay = Math.min(5000 * reconnectAttempts, 30000);
        console.log(`[SKULL] 💀 Desconectado. Ressuscitando em ${delay/1000}s...`);
        if (onDisconnect) onDisconnect();
        setTimeout(() => connectPumpPortal(callbacks), delay);
    });

    ws.on('error', (e) => {
        console.error('[SKULL] Erro:', e.message);
    });

    return ws;
}

export function subscribeNewTokens() {
    if (ws && isConnected) {
        ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
        console.log('[SKULL] 🎯 Sniper ativo - aguardando alvos...');
    }
}

export function subscribeAccount(walletAddress) {
    if (ws && isConnected) {
        ws.send(JSON.stringify({
            method: 'subscribeAccountTrade',
            keys: [walletAddress]
        }));
        console.log('[SKULL] 👁️ Stalkeando:', walletAddress);
    }
}

export function subscribeToken(ca) {
    if (ws && isConnected) {
        ws.send(JSON.stringify({
            method: 'subscribeTokenTrade',
            keys: [ca]
        }));
        console.log('[SKULL] 🔍 Monitorando alvo:', ca);
    }
}

export function isWsConnected() {
    return isConnected;
}

// ═══════════════════════════════════════════════════════════════
// SNIPE (BUY)
// ═══════════════════════════════════════════════════════════════

export async function snipeToken(ca, amountSol, slippage = 15) {
    if (!wallet) {
        console.error('[SNIPE] ☠️ Sem wallet configurada');
        return null;
    }

    try {
        console.log(`[SNIPE] 🎯 Mirando em ${ca} com ${amountSol} SOL`);

        const response = await fetch(config.PUMPPORTAL_TRADE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                publicKey: wallet.publicKey.toBase58(),
                action: 'buy',
                mint: ca,
                amount: amountSol * LAMPORTS_PER_SOL,
                denominatedInSol: 'true',
                slippage,
                priorityFee: 0.001, // Sniper precisa de prioridade
                pool: 'pump'
            })
        });

        if (response.status !== 200) {
            console.error('[SNIPE] ❌ Falhou:', await response.text());
            return null;
        }

        const data = await response.arrayBuffer();
        const tx = VersionedTransaction.deserialize(new Uint8Array(data));
        tx.sign([wallet]);

        const signature = await connection.sendTransaction(tx);
        console.log('[SNIPE] 🩸 KILL CONFIRMADO:', signature);

        return signature;
    } catch (e) {
        console.error('[SNIPE] Erro:', e.message);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// DUMP (SELL)
// ═══════════════════════════════════════════════════════════════

export async function dumpToken(ca, percentOrAmount = 100, slippage = 15) {
    if (!wallet) {
        console.error('[DUMP] ☠️ Sem wallet configurada');
        return null;
    }

    try {
        const amount = percentOrAmount === 100 ? 'all' : `${percentOrAmount}%`;
        console.log(`[DUMP] 💀 Despejando ${amount} de ${ca}`);

        const response = await fetch(config.PUMPPORTAL_TRADE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                publicKey: wallet.publicKey.toBase58(),
                action: 'sell',
                mint: ca,
                amount,
                denominatedInSol: 'false',
                slippage,
                priorityFee: 0.001,
                pool: 'pump'
            })
        });

        if (response.status !== 200) {
            console.error('[DUMP] ❌ Falhou:', await response.text());
            return null;
        }

        const data = await response.arrayBuffer();
        const tx = VersionedTransaction.deserialize(new Uint8Array(data));
        tx.sign([wallet]);

        const signature = await connection.sendTransaction(tx);
        console.log('[DUMP] 💀 DUMP EXECUTADO:', signature);

        return signature;
    } catch (e) {
        console.error('[DUMP] Erro:', e.message);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// CLAIM FEES
// ═══════════════════════════════════════════════════════════════

export async function claimFees(ca) {
    if (!wallet) {
        console.error('[CLAIM] ☠️ Sem wallet');
        return null;
    }

    try {
        console.log(`[CLAIM] 💰 Coletando fees de ${ca}`);

        const response = await fetch('https://pumpportal.fun/api/claim-fees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                publicKey: wallet.publicKey.toBase58(),
                mint: ca
            })
        });

        if (response.status !== 200) {
            const text = await response.text();
            if (text.includes('No fees')) {
                console.log('[CLAIM] Sem fees disponiveis');
                return null;
            }
            console.error('[CLAIM] Erro:', text);
            return null;
        }

        const data = await response.arrayBuffer();
        const tx = VersionedTransaction.deserialize(new Uint8Array(data));
        tx.sign([wallet]);

        const signature = await connection.sendTransaction(tx);
        console.log('[CLAIM] 💰 FEES COLETADOS:', signature);

        return signature;
    } catch (e) {
        console.error('[CLAIM] Erro:', e.message);
        return null;
    }
}
