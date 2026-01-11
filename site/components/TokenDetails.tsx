'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Copy, Check } from 'lucide-react'

interface TokenDetailsProps {
  ca: string
  onClose: () => void
}

interface TokenData {
  mint: string
  name: string
  symbol: string
  description: string
  image: string
  twitter?: string
  telegram?: string
  website?: string
  showName: boolean
  createdOn: string
  marketCap?: number
  usdMarketCap?: number
  bondingCurve?: string
  associatedBondingCurve?: string
  creator?: string
  raydiumPool?: string
  complete?: boolean
}

export default function TokenDetails({ ca, onClose }: TokenDetailsProps) {
  const [token, setToken] = useState<TokenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTokenData()
  }, [ca])

  async function fetchTokenData() {
    setLoading(true)
    setError(null)

    try {
      // Fetch from pump.fun API
      const response = await fetch(`https://frontend-api.pump.fun/coins/${ca}`)

      if (!response.ok) {
        throw new Error('Token not found')
      }

      const data = await response.json()
      setToken(data)
    } catch (err) {
      console.error('Error fetching token:', err)
      setError('Failed to fetch token data')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(ca)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatMcap = (value: number | undefined) => {
    if (!value) return '$0'
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
    return `$${value.toFixed(2)}`
  }

  const getScoreColor = (mcap: number | undefined) => {
    if (!mcap) return 'text-skull-text-dim'
    if (mcap >= 100000) return 'text-skull-text-bright'
    if (mcap >= 50000) return 'text-skull-text'
    if (mcap >= 10000) return 'text-skull-blood'
    return 'text-red-800'
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-void/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="terminal rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="terminal-header p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-skull-text-dim text-xs">TOKEN</span>
              <span className="text-skull-text-dim">|</span>
              <span className="text-skull-blood text-xs">
                {loading ? 'LOADING' : token ? 'FOUND' : 'NOT FOUND'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-skull-text-dim hover:text-skull-blood transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-skull-blood text-2xl"
              >
                ...
              </motion.div>
              <p className="text-skull-text-dim mt-2 text-xs">fetching from pump.fun</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-skull-blood text-xs">{error}</p>
              <p className="text-skull-text-dim text-xs mt-2">CA: {ca.slice(0, 20)}...</p>
            </div>
          ) : token ? (
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
              {/* Token Info */}
              <div className="flex items-start gap-4 mb-6">
                {token.image ? (
                  <img
                    src={token.image}
                    alt={token.symbol}
                    className="w-14 h-14 rounded-lg border border-skull-border opacity-80"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg border border-skull-border flex items-center justify-center text-skull-text-dim text-xl">
                    ?
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-lg text-skull-text-bright font-bold">
                    {token.name}
                  </h2>
                  <p className="text-skull-text-dim text-sm">${token.symbol}</p>
                  {token.complete && (
                    <span className="text-[10px] px-2 py-0.5 bg-skull-blood/20 border border-skull-blood text-skull-blood rounded mt-1 inline-block">
                      GRADUATED
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(token.usdMarketCap)}`}>
                    {formatMcap(token.usdMarketCap)}
                  </div>
                  <div className="text-[10px] text-skull-text-dim">MCAP</div>
                </div>
              </div>

              {/* Description */}
              {token.description && (
                <div className="bg-void border border-skull-border rounded-lg p-3 mb-4">
                  <p className="text-skull-text-dim text-xs leading-relaxed">
                    {token.description.slice(0, 200)}
                    {token.description.length > 200 && '...'}
                  </p>
                </div>
              )}

              {/* CA Box */}
              <div className="bg-void border border-skull-border rounded-lg p-3 mb-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] text-skull-text-dim mb-1">CONTRACT ADDRESS</p>
                    <p className="text-skull-text font-mono text-xs truncate">{ca}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="p-2 border border-skull-border rounded hover:border-skull-blood transition-colors"
                    >
                      {copied ? <Check size={14} className="text-skull-text-bright" /> : <Copy size={14} className="text-skull-text-dim" />}
                    </button>
                    <a
                      href={`https://pump.fun/${ca}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 border border-skull-border rounded hover:border-skull-blood transition-colors"
                    >
                      <ExternalLink size={14} className="text-skull-text-dim" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="bg-void border border-skull-border rounded-lg p-3">
                  <div className="text-skull-text-dim text-[10px] mb-1">USD MCAP</div>
                  <div className="text-skull-text text-sm font-medium">
                    {formatMcap(token.usdMarketCap)}
                  </div>
                </div>
                <div className="bg-void border border-skull-border rounded-lg p-3">
                  <div className="text-skull-text-dim text-[10px] mb-1">STATUS</div>
                  <div className={`text-sm font-medium ${token.complete ? 'text-skull-text-bright' : 'text-skull-blood'}`}>
                    {token.complete ? 'GRADUATED' : 'BONDING'}
                  </div>
                </div>
                {token.creator && (
                  <div className="bg-void border border-skull-border rounded-lg p-3 col-span-2">
                    <div className="text-skull-text-dim text-[10px] mb-1">CREATOR</div>
                    <div className="text-skull-text text-xs font-mono truncate">
                      {token.creator}
                    </div>
                  </div>
                )}
              </div>

              {/* Social Links */}
              {(token.twitter || token.telegram || token.website) && (
                <div className="border border-skull-border rounded-lg p-3 mb-6">
                  <div className="text-skull-text-dim text-[10px] mb-2">SOCIALS</div>
                  <div className="flex gap-2 flex-wrap">
                    {token.twitter && (
                      <a
                        href={token.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 border border-skull-border rounded hover:border-skull-blood text-skull-text-dim text-xs transition-colors"
                      >
                        TWITTER
                      </a>
                    )}
                    {token.telegram && (
                      <a
                        href={token.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 border border-skull-border rounded hover:border-skull-blood text-skull-text-dim text-xs transition-colors"
                      >
                        TELEGRAM
                      </a>
                    )}
                    {token.website && (
                      <a
                        href={token.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 border border-skull-border rounded hover:border-skull-blood text-skull-text-dim text-xs transition-colors"
                      >
                        WEBSITE
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div className="flex gap-2 mt-4">
                <a
                  href={`https://pump.fun/${ca}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2 border border-skull-border rounded hover:border-skull-blood text-skull-text-dim text-xs transition-colors"
                >
                  PUMP.FUN
                </a>
                <a
                  href={`https://dexscreener.com/solana/${ca}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2 border border-skull-border rounded hover:border-skull-blood text-skull-text-dim text-xs transition-colors"
                >
                  DEXSCREENER
                </a>
                <a
                  href={`https://birdeye.so/token/${ca}?chain=solana`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2 border border-skull-border rounded hover:border-skull-blood text-skull-text-dim text-xs transition-colors"
                >
                  BIRDEYE
                </a>
              </div>

              {/* Raydium link if graduated */}
              {token.raydiumPool && (
                <a
                  href={`https://raydium.io/swap/?inputMint=sol&outputMint=${ca}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2 mt-2 bg-skull-blood/20 border border-skull-blood rounded hover:bg-skull-blood/30 text-skull-blood text-xs transition-colors"
                >
                  TRADE ON RAYDIUM
                </a>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-skull-blood text-xs">token not found</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
