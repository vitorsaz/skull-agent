import fs from 'fs';

// ═══════════════════════════════════════════════════════════════
// SKULL AGENT - LOGS EM ARQUIVO
// ═══════════════════════════════════════════════════════════════

if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
}

const logFileName = `./logs/${new Date().toISOString().split('T')[0]}.log`;
const logStream = fs.createWriteStream(logFileName, { flags: 'a' });

const originalLog = console.log;
const originalError = console.error;

const SKULL = '💀';
const CROSSBONES = '☠️';

console.log = (...args) => {
    const msg = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
    logStream.write(msg);
    originalLog.apply(console, args);
};

console.error = (...args) => {
    const msg = `[${new Date().toISOString()}] [DEATH] ${args.join(' ')}\n`;
    logStream.write(msg);
    originalError.apply(console, args);
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatSOL(amount) {
    return parseFloat(amount).toFixed(4);
}

export function formatMarketCap(value) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return `${value.toFixed(2)}`;
}

export function truncateAddress(addr, chars = 4) {
    if (!addr) return '';
    return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

export function isValidSolanaAddress(address) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// ═══════════════════════════════════════════════════════════════
// ASCII ART HELPERS
// ═══════════════════════════════════════════════════════════════

export function printSkull() {
    console.log(`
    ░██████╗██╗░░██╗██╗░░░██╗██╗░░░░░██╗░░░░░
    ██╔════╝██║░██╔╝██║░░░██║██║░░░░░██║░░░░░
    ╚█████╗░█████═╝░██║░░░██║██║░░░░░██║░░░░░
    ░╚═══██╗██╔═██╗░██║░░░██║██║░░░░░██║░░░░░
    ██████╔╝██║░╚██╗╚██████╔╝███████╗███████╗
    ╚═════╝░╚═╝░░╚═╝░╚═════╝░╚══════╝╚══════╝
              ▄︻̷̿┻̿═━一  AGENT
                  ☠️ SNIPER MODE ☠️
    `);
}

export function printKill(tokenName, symbol, profit) {
    const status = profit >= 0 ? '🩸 KILL' : '💀 REKT';
    console.log(`
    ╔════════════════════════════════════════╗
    ║  ${status} - ${symbol.padEnd(10)} ${profit >= 0 ? '+' : ''}${profit.toFixed(2)}%
    ║  ${tokenName.slice(0, 30)}
    ╚════════════════════════════════════════╝
    `);
}

// ═══════════════════════════════════════════════════════════════
// IPFS GATEWAYS
// ═══════════════════════════════════════════════════════════════

const IPFS_GATEWAYS = [
    'https://nftstorage.link/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://ipfs.io/ipfs/'
];

export async function fetchImageFromIPFS(metadataUri) {
    if (!metadataUri) return null;

    try {
        let url = metadataUri;

        const ipfsMatch = metadataUri.match(/ipfs[./]+(Qm[a-zA-Z0-9]+|bafk[a-zA-Z0-9]+)/i);
        if (ipfsMatch) {
            url = `https://nftstorage.link/ipfs/${ipfsMatch[1]}`;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) return null;

        const json = await response.json();
        let imageUrl = json.image || json.imageUrl || null;

        if (imageUrl) {
            const imgMatch = imageUrl.match(/ipfs[./]+(Qm[a-zA-Z0-9]+|bafk[a-zA-Z0-9]+)/i);
            if (imgMatch) {
                imageUrl = `https://nftstorage.link/ipfs/${imgMatch[1]}`;
            }
        }

        return imageUrl;
    } catch {
        return null;
    }
}
