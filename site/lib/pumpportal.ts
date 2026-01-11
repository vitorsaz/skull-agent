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

const SOL_PRICE_USD = 180 // Approximate, could fetch real price

export function calculateScore(token: LiveToken): { score: number; status: string } {
  let score = 50 // Base score

  // Market cap scoring (in SOL)
  const mcapSol = token.marketCapSol || 0
  if (mcapSol >= 10 && mcapSol <= 100) score += 20
  else if (mcapSol > 100 && mcapSol <= 500) score += 15
  else if (mcapSol > 500) score += 5
  else if (mcapSol < 5) score -= 10

  // Initial buy scoring
  const initialBuySol = token.initialBuy / 1e9
  if (initialBuySol >= 0.5 && initialBuySol <= 5) score += 15
  else if (initialBuySol > 5 && initialBuySol <= 20) score += 10
  else if (initialBuySol > 20) score -= 10 // Dev bought too much
  else if (initialBuySol < 0.1) score += 5

  // Liquidity in bonding curve
  const liquiditySol = token.vSolInBondingCurve / 1e9
  if (liquiditySol >= 5) score += 10
  else if (liquiditySol >= 2) score += 5

  // Cap score
  score = Math.max(0, Math.min(100, score))

  // Determine status
  let status = 'SCANNING'
  if (score >= 80) status = 'EXCELLENT'
  else if (score >= 65) status = 'GOOD'
  else if (score >= 50) status = 'RISKY'
  else status = 'AVOID'

  return { score, status }
}

export async function fetchTokenMetadata(uri: string): Promise<TokenMetadata | null> {
  try {
    // Handle IPFS URIs
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
  private maxReconnects = 5
  private subscribedTokens: Set<string> = new Set()
  private onTokenCallback: ((token: LiveToken) => void) | null = null
  private onTradeCallback: ((trade: TradeUpdate) => void) | null = null
  private onStatusCallback: ((status: 'connected' | 'disconnected' | 'connecting') => void) | null = null

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.onStatusCallback?.('connecting')

    try {
      this.ws = new WebSocket('wss://pumpportal.fun/api/data')

      this.ws.onopen = () => {
        console.log('[SKULL] Connected to PumpPortal')
        this.reconnectAttempts = 0
        this.onStatusCallback?.('connected')

        // Subscribe to new tokens
        this.ws?.send(JSON.stringify({ method: 'subscribeNewToken' }))

        // Re-subscribe to previously tracked tokens
        if (this.subscribedTokens.size > 0) {
          const tokens = Array.from(this.subscribedTokens)
          this.ws?.send(JSON.stringify({
            method: 'subscribeTokenTrade',
            keys: tokens
          }))
        }
      }

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data)

          // Check if it's a new token event
          if (data.txType === 'create' && data.mint) {
            const token: LiveToken = {
              signature: data.signature || '',
              mint: data.mint,
              traderPublicKey: data.traderPublicKey || '',
              txType: data.txType,
              initialBuy: data.initialBuy || 0,
              bondingCurveKey: data.bondingCurveKey || '',
              vTokensInBondingCurve: data.vTokensInBondingCurve || 0,
              vSolInBondingCurve: data.vSolInBondingCurve || 0,
              marketCapSol: data.marketCapSol || 0,
              name: data.name || 'Unknown',
              symbol: data.symbol || '???',
              uri: data.uri || '',
              timestamp: Date.now(),
              marketCapUsd: (data.marketCapSol || 0) * SOL_PRICE_USD,
            }

            // Calculate score
            const { score, status } = calculateScore(token)
            token.score = score
            token.status = status

            // Try to fetch metadata for logo
            if (token.uri) {
              fetchTokenMetadata(token.uri).then(meta => {
                if (meta?.image) {
                  token.logo = meta.image
                }
              })
            }

            // Auto-subscribe to this token's trades
            this.subscribeToToken(token.mint)

            this.onTokenCallback?.(token)
          }
          // Check if it's a trade event (buy/sell)
          else if ((data.txType === 'buy' || data.txType === 'sell') && data.mint) {
            const trade: TradeUpdate = {
              mint: data.mint,
              txType: data.txType,
              tokenAmount: data.tokenAmount || 0,
              solAmount: data.solAmount || 0,
              marketCapSol: data.marketCapSol || 0,
              marketCapUsd: (data.marketCapSol || 0) * SOL_PRICE_USD,
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

      this.ws.onclose = () => {
        console.log('[SKULL] Disconnected from PumpPortal')
        this.onStatusCallback?.('disconnected')
        this.attemptReconnect()
      }

      this.ws.onerror = (err) => {
        console.error('[SKULL] WebSocket error:', err)
        this.onStatusCallback?.('disconnected')
      }
    } catch (err) {
      console.error('[SKULL] Connection error:', err)
      this.onStatusCallback?.('disconnected')
      this.attemptReconnect()
    }
  }

  subscribeToToken(mint: string) {
    if (this.subscribedTokens.has(mint)) return

    // Limit subscriptions to avoid overload
    if (this.subscribedTokens.size >= 50) {
      // Remove oldest subscription
      const oldest = this.subscribedTokens.values().next().value
      if (oldest) {
        this.subscribedTokens.delete(oldest)
      }
    }

    this.subscribedTokens.add(mint)

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        method: 'subscribeTokenTrade',
        keys: [mint]
      }))
      console.log('[SKULL] Subscribed to trades for:', mint.slice(0, 8))
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
      console.log('[SKULL] Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

    console.log(`[SKULL] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
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
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
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
