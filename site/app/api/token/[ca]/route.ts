import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ca: string }> }
) {
  const { ca } = await context.params

  if (!ca || ca.length < 32) {
    return NextResponse.json({ error: 'Invalid contract address' }, { status: 400 })
  }

  console.log('[API] Fetching token:', ca)

  // Try DexScreener first (most reliable)
  try {
    console.log('[API] Trying DexScreener...')
    const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    })

    if (dexResponse.ok) {
      const dexData = await dexResponse.json()
      if (dexData.pairs && dexData.pairs.length > 0) {
        const pair = dexData.pairs[0]
        console.log('[API] Success from DexScreener')

        const tokenData = {
          mint: ca,
          name: pair.baseToken?.name || 'Unknown',
          symbol: pair.baseToken?.symbol || '???',
          description: '',
          image: pair.info?.imageUrl || '',
          twitter: pair.info?.socials?.find((s: any) => s.type === 'twitter')?.url || null,
          telegram: pair.info?.socials?.find((s: any) => s.type === 'telegram')?.url || null,
          website: pair.info?.websites?.[0]?.url || null,
          showName: true,
          createdOn: pair.pairCreatedAt ? new Date(pair.pairCreatedAt).toISOString() : '',
          marketCap: pair.marketCap || 0,
          usdMarketCap: pair.marketCap || pair.fdv || 0,
          bondingCurve: '',
          associatedBondingCurve: '',
          creator: '',
          raydiumPool: pair.pairAddress || null,
          complete: true, // If on DexScreener, it graduated
          reply_count: 0,
          king_of_the_hill_timestamp: null,
          created_timestamp: pair.pairCreatedAt || null,
          // Extra DexScreener data
          priceUsd: pair.priceUsd || '0',
          priceChange24h: pair.priceChange?.h24 || 0,
          volume24h: pair.volume?.h24 || 0,
          liquidity: pair.liquidity?.usd || 0,
          dexId: pair.dexId || 'unknown'
        }

        const analysis = analyzeToken(tokenData)

        return NextResponse.json({
          ...tokenData,
          analysis
        })
      }
    }
  } catch (error) {
    console.log('[API] DexScreener failed:', error)
  }

  // Try pump.fun APIs as fallback
  const pumpEndpoints = [
    {
      url: `https://frontend-api.pump.fun/coins/${ca}`,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    },
    {
      url: `https://client-api-2-74b1891ee9f9.herokuapp.com/coins/${ca}`,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      }
    }
  ]

  for (const endpoint of pumpEndpoints) {
    try {
      console.log('[API] Trying:', endpoint.url)

      const response = await fetch(endpoint.url, {
        headers: endpoint.headers,
        cache: 'no-store',
        signal: AbortSignal.timeout(8000)
      })

      if (response.ok) {
        const data = await response.json()
        console.log('[API] Success from:', endpoint.url)

        const tokenData = {
          mint: data.mint || ca,
          name: data.name || 'Unknown',
          symbol: data.symbol || '???',
          description: data.description || '',
          image: data.image_uri || data.image || '',
          twitter: data.twitter || null,
          telegram: data.telegram || null,
          website: data.website || null,
          showName: data.show_name ?? true,
          createdOn: data.created_timestamp ? new Date(data.created_timestamp).toISOString() : '',
          marketCap: data.market_cap || 0,
          usdMarketCap: data.usd_market_cap || 0,
          bondingCurve: data.bonding_curve || '',
          associatedBondingCurve: data.associated_bonding_curve || '',
          creator: data.creator || '',
          raydiumPool: data.raydium_pool || null,
          complete: data.complete || false,
          reply_count: data.reply_count || 0,
          king_of_the_hill_timestamp: data.king_of_the_hill_timestamp || null,
          created_timestamp: data.created_timestamp || null
        }

        const analysis = analyzeToken(tokenData)

        return NextResponse.json({
          ...tokenData,
          analysis
        })
      } else {
        console.log('[API] Failed:', endpoint.url, response.status)
      }
    } catch (error) {
      console.error('[API] Error from:', endpoint.url, error)
    }
  }

  // If all endpoints fail, return error
  return NextResponse.json(
    { error: 'Token not found on pump.fun or DexScreener' },
    { status: 404 }
  )
}

interface TokenData {
  name: string
  symbol: string
  description?: string
  twitter?: string | null
  telegram?: string | null
  website?: string | null
  usdMarketCap?: number
  creator?: string
  complete?: boolean
  reply_count?: number
  king_of_the_hill_timestamp?: number | null
  created_timestamp?: number | null
}

interface Analysis {
  score: number
  verdict: string
  narrativeScore: number
  socialScore: number
  riskScore: number
  signals: Signal[]
  redFlags: string[]
  greenFlags: string[]
  recommendation: string
}

interface Signal {
  type: 'positive' | 'negative' | 'neutral'
  category: string
  message: string
  weight: number
}

function analyzeToken(token: TokenData): Analysis {
  const signals: Signal[] = []
  const redFlags: string[] = []
  const greenFlags: string[] = []

  let narrativeScore = 50
  let socialScore = 50
  let riskScore = 50

  const name = (token.name || '').toLowerCase()
  const symbol = (token.symbol || '').toLowerCase()
  const description = (token.description || '').toLowerCase()

  // ===== NARRATIVE ANALYSIS =====
  const trendingNarratives = [
    { keywords: ['ai', 'artificial', 'intelligence', 'gpt', 'agent', 'neural'], name: 'AI/Agent', bonus: 15 },
    { keywords: ['trump', 'maga', 'donald', 'president', 'election'], name: 'Political', bonus: 12 },
    { keywords: ['elon', 'musk', 'tesla', 'doge', 'x.com', 'spacex'], name: 'Elon/Tech', bonus: 12 },
    { keywords: ['pepe', 'frog', 'rare', 'kek', 'wojak'], name: 'Pepe/Meme', bonus: 10 },
    { keywords: ['cat', 'kitty', 'meow', 'kitten', 'popcat'], name: 'Cat Meta', bonus: 10 },
    { keywords: ['dog', 'doge', 'shiba', 'puppy', 'woof', 'inu'], name: 'Dog Meta', bonus: 8 },
    { keywords: ['sol', 'solana', 'jupiter', 'raydium'], name: 'Solana Native', bonus: 8 },
    { keywords: ['bonk', 'bork', 'wif', 'hat'], name: 'SOL Meme', bonus: 10 },
    { keywords: ['anime', 'waifu', 'kawaii', 'chan', 'sensei'], name: 'Anime', bonus: 6 },
    { keywords: ['game', 'gaming', 'play', 'nft', 'metaverse'], name: 'Gaming', bonus: 5 },
    { keywords: ['moon', 'rocket', '100x', '1000x', 'gem'], name: 'Hype', bonus: -5 },
  ]

  for (const narrative of trendingNarratives) {
    const found = narrative.keywords.some(kw =>
      name.includes(kw) || symbol.includes(kw) || description.includes(kw)
    )
    if (found) {
      narrativeScore += narrative.bonus
      if (narrative.bonus > 0) {
        signals.push({
          type: 'positive',
          category: 'Narrative',
          message: `${narrative.name} narrative detected`,
          weight: narrative.bonus
        })
        greenFlags.push(`Trending narrative: ${narrative.name}`)
      } else {
        signals.push({
          type: 'negative',
          category: 'Narrative',
          message: `${narrative.name} - often overused`,
          weight: narrative.bonus
        })
      }
    }
  }

  // Name quality analysis
  if (name.length <= 3) {
    narrativeScore += 5
    signals.push({ type: 'positive', category: 'Name', message: 'Short memorable ticker', weight: 5 })
  }

  if (name.length > 20) {
    narrativeScore -= 10
    signals.push({ type: 'negative', category: 'Name', message: 'Name too long', weight: -10 })
    redFlags.push('Long/complex name - harder to remember')
  }

  // Check for copy/scam patterns
  const scamPatterns = [
    { pattern: /v2|v3|2\.0|3\.0/i, message: 'Version suffix - possible copy' },
    { pattern: /official|real|legit|verified/i, message: 'Claims to be official - scam indicator' },
    { pattern: /airdrop|free|giveaway/i, message: 'Airdrop/giveaway claims - high risk' },
    { pattern: /1000x|10000x|guaranteed/i, message: 'Unrealistic promises' },
    { pattern: /rug|honeypot|scam/i, message: 'Suspicious keywords in name' },
  ]

  for (const { pattern, message } of scamPatterns) {
    if (pattern.test(name) || pattern.test(description)) {
      riskScore -= 20
      redFlags.push(message)
      signals.push({ type: 'negative', category: 'Risk', message, weight: -20 })
    }
  }

  // Original name bonus
  const genericNames = ['token', 'coin', 'money', 'cash', 'crypto', 'defi']
  const isGeneric = genericNames.some(g => name === g || symbol === g)
  if (isGeneric) {
    narrativeScore -= 15
    redFlags.push('Generic/unoriginal name')
  }

  // ===== SOCIAL ANALYSIS =====
  if (token.twitter) {
    socialScore += 15
    greenFlags.push('Has Twitter')
    signals.push({ type: 'positive', category: 'Social', message: 'Twitter present', weight: 15 })
  } else {
    socialScore -= 10
    signals.push({ type: 'negative', category: 'Social', message: 'No Twitter', weight: -10 })
  }

  if (token.telegram) {
    socialScore += 15
    greenFlags.push('Has Telegram')
    signals.push({ type: 'positive', category: 'Social', message: 'Telegram present', weight: 15 })
  } else {
    socialScore -= 5
  }

  if (token.website) {
    socialScore += 10
    greenFlags.push('Has Website')
    signals.push({ type: 'positive', category: 'Social', message: 'Website present', weight: 10 })
  }

  // No socials at all
  if (!token.twitter && !token.telegram && !token.website) {
    socialScore -= 20
    redFlags.push('No social links - high risk')
    signals.push({ type: 'negative', category: 'Social', message: 'Zero social presence', weight: -20 })
  }

  // Reply count (engagement)
  if (token.reply_count) {
    if (token.reply_count > 100) {
      socialScore += 15
      greenFlags.push(`High engagement: ${token.reply_count} replies`)
    } else if (token.reply_count > 20) {
      socialScore += 8
      greenFlags.push(`Good engagement: ${token.reply_count} replies`)
    } else if (token.reply_count < 5) {
      socialScore -= 5
    }
  }

  // ===== MARKET ANALYSIS =====
  const mcap = token.usdMarketCap || 0

  if (mcap > 0 && mcap < 10000) {
    riskScore += 10
    signals.push({ type: 'positive', category: 'Market', message: 'Very early entry possible', weight: 10 })
    greenFlags.push('Low mcap - early entry')
  } else if (mcap >= 10000 && mcap < 50000) {
    riskScore += 5
    signals.push({ type: 'positive', category: 'Market', message: 'Good entry point', weight: 5 })
  } else if (mcap >= 100000) {
    riskScore -= 5
    signals.push({ type: 'neutral', category: 'Market', message: 'Higher mcap - more established', weight: 0 })
  }

  // King of the hill (trending)
  if (token.king_of_the_hill_timestamp) {
    socialScore += 20
    greenFlags.push('Was King of the Hill')
    signals.push({ type: 'positive', category: 'Trending', message: 'Reached King of the Hill', weight: 20 })
  }

  // Graduated to Raydium
  if (token.complete) {
    riskScore += 15
    greenFlags.push('Graduated to Raydium')
    signals.push({ type: 'positive', category: 'Market', message: 'Bonding curve completed', weight: 15 })
  }

  // Token age (if we have created_timestamp)
  if (token.created_timestamp) {
    const ageMinutes = (Date.now() - token.created_timestamp) / 60000
    if (ageMinutes < 5) {
      riskScore += 10
      greenFlags.push('Brand new token - early')
      signals.push({ type: 'positive', category: 'Timing', message: 'Very fresh token (<5min)', weight: 10 })
    } else if (ageMinutes < 30) {
      riskScore += 5
      signals.push({ type: 'positive', category: 'Timing', message: 'Fresh token (<30min)', weight: 5 })
    } else if (ageMinutes > 1440) {
      riskScore -= 5
      signals.push({ type: 'neutral', category: 'Timing', message: 'Older token (>24h)', weight: -5 })
    }
  }

  // ===== CALCULATE FINAL SCORE =====
  narrativeScore = Math.max(0, Math.min(100, narrativeScore))
  socialScore = Math.max(0, Math.min(100, socialScore))
  riskScore = Math.max(0, Math.min(100, riskScore))

  const finalScore = Math.round(
    (narrativeScore * 0.35) +
    (socialScore * 0.30) +
    (riskScore * 0.35)
  )

  let verdict: string
  let recommendation: string

  if (finalScore >= 75) {
    verdict = 'EXCELLENT'
    recommendation = 'Strong snipe candidate. Good narrative, social presence, and timing.'
  } else if (finalScore >= 60) {
    verdict = 'GOOD'
    recommendation = 'Decent opportunity. Consider entry with proper risk management.'
  } else if (finalScore >= 45) {
    verdict = 'RISKY'
    recommendation = 'Proceed with caution. Multiple concerns detected.'
  } else {
    verdict = 'AVOID'
    recommendation = 'Too many red flags. High probability of loss.'
  }

  if (redFlags.length >= 3) {
    verdict = 'AVOID'
    recommendation = 'Multiple red flags detected. Do not enter.'
  }

  return {
    score: finalScore,
    verdict,
    narrativeScore,
    socialScore,
    riskScore,
    signals,
    redFlags,
    greenFlags,
    recommendation
  }
}
