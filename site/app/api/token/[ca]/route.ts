import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { ca: string } }
) {
  const ca = params.ca

  if (!ca || ca.length < 32) {
    return NextResponse.json({ error: 'Invalid contract address' }, { status: 400 })
  }

  try {
    // Fetch token data from pump.fun
    const response = await fetch(`https://frontend-api.pump.fun/coins/${ca}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      next: { revalidate: 30 } // Cache for 30 seconds
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    const data = await response.json()

    // Perform deep analysis
    const analysis = analyzeToken(data)

    return NextResponse.json({
      ...data,
      analysis
    })
  } catch (error) {
    console.error('Error fetching token:', error)
    return NextResponse.json({ error: 'Failed to fetch token data' }, { status: 500 })
  }
}

interface TokenData {
  name: string
  symbol: string
  description?: string
  twitter?: string
  telegram?: string
  website?: string
  usdMarketCap?: number
  creator?: string
  complete?: boolean
  reply_count?: number
  king_of_the_hill_timestamp?: number
  created_timestamp?: number
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

  // Trending narratives (2024-2025)
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
    } else if (ageMinutes > 1440) { // > 24 hours
      riskScore -= 5
      signals.push({ type: 'neutral', category: 'Timing', message: 'Older token (>24h)', weight: -5 })
    }
  }

  // ===== CALCULATE FINAL SCORE =====

  // Cap individual scores
  narrativeScore = Math.max(0, Math.min(100, narrativeScore))
  socialScore = Math.max(0, Math.min(100, socialScore))
  riskScore = Math.max(0, Math.min(100, riskScore))

  // Weighted average
  const finalScore = Math.round(
    (narrativeScore * 0.35) +
    (socialScore * 0.30) +
    (riskScore * 0.35)
  )

  // Determine verdict and recommendation
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

  // Override verdict if too many red flags
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
