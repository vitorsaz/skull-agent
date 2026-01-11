'use client'

export interface LiveToken {
  signature: string
  mint: string
  traderPublicKey: string
  txType: string
  initialBuy: number
  bondingCurveKey: string
  vTokensInBondingCurve: number
  vSolInBondingCurve: number
  marketCapSol: number
  name: string
  symbol: string
  uri: string
  timestamp: number
  // Calculated fields
  marketCapUsd?: number
  score?: number
  status?: string
  logo?: string
  narrativeMatch?: string
}

export interface TradeUpdate {
  mint: string
  txType: 'buy' | 'sell'
  tokenAmount: number
  solAmount: number
  marketCapSol: number
  marketCapUsd: number
  vSolInBondingCurve: number
  vTokensInBondingCurve: number
  traderPublicKey: string
  signature: string
  timestamp: number
}

export interface TokenMetadata {
  name: string
  symbol: string
  description?: string
  image?: string
  showName?: boolean
  createdOn?: string
  twitter?: string
  telegram?: string
  website?: string
}

// Fetch SOL price from API
let SOL_PRICE_USD = 180
let lastPriceFetch = 0

async function updateSolPrice() {
  if (Date.now() - lastPriceFetch < 60000) return // Update every minute
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
    const data = await res.json()
    if (data?.solana?.usd) {
      SOL_PRICE_USD = data.solana.usd
      lastPriceFetch = Date.now()
    }
  } catch {
    // Keep using cached price
  }
}

// Trending narratives for deep analysis
const TRENDING_NARRATIVES = [
  { keywords: ['ai', 'artificial', 'intelligence', 'gpt', 'agent', 'neural', 'bot'], name: 'AI/Agent', bonus: 15 },
  { keywords: ['trump', 'maga', 'donald', 'president', 'election', 'biden'], name: 'Political', bonus: 12 },
  { keywords: ['elon', 'musk', 'tesla', 'doge', 'spacex', 'twitter'], name: 'Elon/Tech', bonus: 12 },
  { keywords: ['pepe', 'frog', 'rare', 'kek', 'wojak', 'meme'], name: 'Pepe/Meme', bonus: 10 },
  { keywords: ['cat', 'kitty', 'meow', 'kitten', 'popcat', 'nyan'], name: 'Cat Meta', bonus: 10 },
  { keywords: ['dog', 'doge', 'shiba', 'puppy', 'woof', 'inu', 'wif'], name: 'Dog Meta', bonus: 10 },
  { keywords: ['bonk', 'bork', 'hat', 'based'], name: 'SOL Meme', bonus: 10 },
  { keywords: ['sol', 'solana', 'jupiter', 'raydium', 'phantom'], name: 'Solana', bonus: 8 },
  { keywords: ['anime', 'waifu', 'kawaii', 'chan', 'sensei', 'sama'], name: 'Anime', bonus: 6 },
  { keywords: ['game', 'gaming', 'play', 'arcade'], name: 'Gaming', bonus: 5 },
]

// Scam patterns to avoid
const SCAM_PATTERNS = [
  /v2|v3|2\.0|3\.0/i,
  /official|real|legit|verified/i,
  /airdrop|free|giveaway/i,
  /1000x|10000x|guaranteed|safe/i,
  /rug|honeypot|scam/i,
]

export function calculateScore(token: LiveToken): { score: number; status: string; narrative?: string } {
  let score = 50
  let narrative: string | undefined

  const name = (token.name || '').toLowerCase()
  const symbol = (token.symbol || '').toLowerCase()

  // ===== NARRATIVE ANALYSIS =====
  for (const n of TRENDING_NARRATIVES) {
    const found = n.keywords.some(kw => name.includes(kw) || symbol.includes(kw))
    if (found) {
      score += n.bonus
      narrative = n.name
      break // Only count first/best narrative match
    }
  }

  // ===== SCAM DETECTION =====
  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(name)) {
      score -= 25
      break
    }
  }

  // ===== NAME QUALITY =====
  // Short memorable names are better
  if (symbol.length <= 4) score += 5
  if (name.length > 20) score -= 10

  // Generic names are bad
  const genericNames = ['token', 'coin', 'money', 'cash', 'crypto', 'defi', 'moon', 'rocket']
  if (genericNames.some(g => name === g || symbol === g)) {
    score -= 15
  }

  // ===== MARKET ANALYSIS =====
  const mcapSol = token.marketCapSol || 0

  // Sweet spot for sniping
  if (mcapSol >= 5 && mcapSol <= 50) score += 15
  else if (mcapSol > 50 && mcapSol <= 150) score += 10
  else if (mcapSol > 150 && mcapSol <= 300) score += 5
  else if (mcapSol > 300) score -= 5 // Too late
  else if (mcapSol < 3) score += 5 // Very early but risky

  // ===== LIQUIDITY ANALYSIS =====
  const liquiditySol = token.vSolInBondingCurve / 1e9
  if (liquiditySol >= 5 && liquiditySol <= 30) score += 10
  else if (liquiditySol > 30) score += 5
  else if (liquiditySol < 2) score -= 5

  // ===== DEV BUY ANALYSIS =====
  const devBuySol = token.initialBuy / 1e9

  // Ideal dev buy: 0.5-3 SOL (shows confidence without dumping risk)
  if (devBuySol >= 0.5 && devBuySol <= 3) score += 10
  else if (devBuySol > 3 && devBuySol <= 10) score += 5
  else if (devBuySol > 10) score -= 15 // Dev bought too much - dump risk
  else if (devBuySol < 0.1) score -= 5 // No dev confidence

  // Cap score
  score = Math.max(0, Math.min(100, score))

  // Determine status
  let status = 'SCANNING'
  if (score >= 75) status = 'EXCELLENT'
  else if (score >= 60) status = 'GOOD'
  else if (score >= 45) status = 'RISKY'
  else status = 'AVOID'

  return { score, status, narrative }
}

export async function fetchTokenMetadata(uri: string): Promise<TokenMetadata | null> {
  try {
    let fetchUri = uri
    if (uri.startsWith('ipfs://')) {
      fetchUri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
    }

    const response = await fetch(fetchUri, {
      signal: AbortSignal.timeout(5000)
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export class PumpPortalSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnects = 10
  private subscribedTokens: Set<string> = new Set()
  private onTokenCallback: ((token: LiveToken) => void) | null = null
  private onTradeCallback: ((trade: TradeUpdate) => void) | null = null
  private onStatusCallback: ((status: 'connected' | 'disconnected' | 'connecting') => void) | null = null
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private isConnecting = false

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return

    this.isConnecting = true
    this.onStatusCallback?.('connecting')

    // Update SOL price
    updateSolPrice()

    try {
      console.log('[SKULL] Connecting to PumpPortal...')
      this.ws = new WebSocket('wss://pumpportal.fun/api/data')

      this.ws.onopen = () => {
        console.log('[SKULL] Connected to PumpPortal WebSocket')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.onStatusCallback?.('connected')

        // Subscribe to new token creations
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ method: 'subscribeNewToken' }))
          console.log('[SKULL] Subscribed to new tokens')
        }

        // Re-subscribe to previously tracked tokens
        if (this.subscribedTokens.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
          const tokens = Array.from(this.subscribedTokens)
          this.ws.send(JSON.stringify({
            method: 'subscribeTokenTrade',
            keys: tokens
          }))
          console.log(`[SKULL] Re-subscribed to ${tokens.length} token trades`)
        }

        // Setup ping to keep connection alive
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            // Send a ping-like message to keep connection alive
            try {
              this.ws.send(JSON.stringify({ method: 'ping' }))
            } catch {
              // Ignore ping errors
            }
          }
        }, 30000) // Every 30 seconds
      }

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data)

          // Debug logging
          if (data.txType) {
            console.log(`[SKULL] Event: ${data.txType}`, data.name || data.mint?.slice(0, 8))
          }

          // Check if it's a new token creation event
          if (data.txType === 'create' && data.mint) {
            const mcapSol = data.marketCapSol || 0
            const token: LiveToken = {
              signature: data.signature || '',
              mint: data.mint,
              traderPublicKey: data.traderPublicKey || '',
              txType: data.txType,
              initialBuy: data.initialBuy || 0,
              bondingCurveKey: data.bondingCurveKey || '',
              vTokensInBondingCurve: data.vTokensInBondingCurve || 0,
              vSolInBondingCurve: data.vSolInBondingCurve || 0,
              marketCapSol: mcapSol,
              name: data.name || 'Unknown',
              symbol: data.symbol || '???',
              uri: data.uri || '',
              timestamp: Date.now(),
              marketCapUsd: mcapSol * SOL_PRICE_USD,
            }

            // Calculate score with deep analysis
            const { score, status, narrative } = calculateScore(token)
            token.score = score
            token.status = status
            token.narrativeMatch = narrative

            // Try to fetch metadata for logo
            if (token.uri) {
              fetchTokenMetadata(token.uri).then(meta => {
                if (meta?.image) {
                  token.logo = meta.image
                }
              }).catch(() => {})
            }

            // Auto-subscribe to this token's trades for real-time mcap updates
            this.subscribeToToken(token.mint)

            this.onTokenCallback?.(token)
          }
          // Check if it's a trade event (buy/sell)
          else if ((data.txType === 'buy' || data.txType === 'sell') && data.mint) {
            const mcapSol = data.marketCapSol || 0
            const trade: TradeUpdate = {
              mint: data.mint,
              txType: data.txType,
              tokenAmount: data.tokenAmount || 0,
              solAmount: data.solAmount || 0,
              marketCapSol: mcapSol,
              marketCapUsd: mcapSol * SOL_PRICE_USD,
              vSolInBondingCurve: data.vSolInBondingCurve || 0,
              vTokensInBondingCurve: data.vTokensInBondingCurve || 0,
              traderPublicKey: data.traderPublicKey || '',
              signature: data.signature || '',
              timestamp: Date.now()
            }

            this.onTradeCallback?.(trade)
          }
        } catch (err) {
          console.error('[SKULL] Parse error:', err)
        }
      }

      this.ws.onclose = (event) => {
        console.log('[SKULL] WebSocket closed:', event.code, event.reason)
        this.isConnecting = false
        this.onStatusCallback?.('disconnected')
        this.clearPing()
        this.attemptReconnect()
      }

      this.ws.onerror = (err) => {
        console.error('[SKULL] WebSocket error:', err)
        this.isConnecting = false
        this.onStatusCallback?.('disconnected')
      }
    } catch (err) {
      console.error('[SKULL] Connection error:', err)
      this.isConnecting = false
      this.onStatusCallback?.('disconnected')
      this.attemptReconnect()
    }
  }

  private clearPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  subscribeToToken(mint: string) {
    if (this.subscribedTokens.has(mint)) return

    // Limit subscriptions to avoid overload
    if (this.subscribedTokens.size >= 100) {
      // Remove oldest subscription
      const oldest = this.subscribedTokens.values().next().value
      if (oldest) {
        this.subscribedTokens.delete(oldest)
        // Unsubscribe from the oldest token
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            method: 'unsubscribeTokenTrade',
            keys: [oldest]
          }))
        }
      }
    }

    this.subscribedTokens.add(mint)

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        method: 'subscribeTokenTrade',
        keys: [mint]
      }))
      console.log(`[SKULL] Subscribed to trades for ${mint.slice(0, 8)}...`)
    }
  }

  unsubscribeFromToken(mint: string) {
    this.subscribedTokens.delete(mint)

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        method: 'unsubscribeTokenTrade',
        keys: [mint]
      }))
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnects) {
      console.log('[SKULL] Max reconnection attempts reached, will retry in 1 minute')
      // Reset after 1 minute and try again
      setTimeout(() => {
        this.reconnectAttempts = 0
        this.connect()
      }, 60000)
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000)

    console.log(`[SKULL] Reconnecting in ${Math.round(delay/1000)}s (attempt ${this.reconnectAttempts}/${this.maxReconnects})`)
    setTimeout(() => this.connect(), delay)
  }

  onToken(callback: (token: LiveToken) => void) {
    this.onTokenCallback = callback
  }

  onTrade(callback: (trade: TradeUpdate) => void) {
    this.onTradeCallback = callback
  }

  onStatus(callback: (status: 'connected' | 'disconnected' | 'connecting') => void) {
    this.onStatusCallback = callback
  }

  disconnect() {
    this.clearPing()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  getStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (this.isConnecting) return 'connecting'
    if (this.ws?.readyState === WebSocket.OPEN) return 'connected'
    return 'disconnected'
  }
}

// Singleton instance
let socketInstance: PumpPortalSocket | null = null

export function getPumpPortalSocket(): PumpPortalSocket {
  if (!socketInstance) {
    socketInstance = new PumpPortalSocket()
  }
  return socketInstance
}
