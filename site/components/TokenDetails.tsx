'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Copy, Check, AlertTriangle, CheckCircle, TrendingUp, Users, Shield } from 'lucide-react'

interface TokenDetailsProps {
  ca: string
  onClose: () => void
}

interface Signal {
  type: 'positive' | 'negative' | 'neutral'
  category: string
  message: string
  weight: number
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
  reply_count?: number
  analysis?: Analysis
}

export default function TokenDetails({ ca, onClose }: TokenDetailsProps) {
  const [token, setToken] = useState<TokenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'overview' | 'analysis' | 'signals' | 'ca'>('overview')

  useEffect(() => {
    fetchTokenData()
  }, [ca])

  async function fetchTokenData() {
    setLoading(true)
    setError(null)

    try {
      // Use our API route to bypass CORS
      const response = await fetch(`/api/token/${ca}`)

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Token not found')
      }

      const data = await response.json()
      setToken(data)
    } catch (err) {
      console.error('Error fetching token:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch token data')
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

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'EXCELLENT': return 'text-green-400 border-green-400'
      case 'GOOD': return 'text-skull-text-bright border-skull-text-bright'
      case 'RISKY': return 'text-yellow-500 border-yellow-500'
      case 'AVOID': return 'text-red-500 border-red-500'
      default: return 'text-skull-text-dim border-skull-border'
    }
  }

  const getVerdictBg = (verdict: string) => {
    switch (verdict) {
      case 'EXCELLENT': return 'bg-green-400/10'
      case 'GOOD': return 'bg-skull-text-bright/10'
      case 'RISKY': return 'bg-yellow-500/10'
      case 'AVOID': return 'bg-red-500/10'
      default: return 'bg-skull-border/10'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-400'
    if (score >= 60) return 'text-skull-text-bright'
    if (score >= 45) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getScoreBarColor = (score: number) => {
    if (score >= 75) return 'bg-green-400'
    if (score >= 60) return 'bg-skull-text-bright'
    if (score >= 45) return 'bg-yellow-500'
    return 'bg-red-500'
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
          className="terminal rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="terminal-header p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-skull-text-dim text-xs">SKULL AGENT</span>
              <span className="text-skull-text-dim">|</span>
              <span className="text-skull-blood text-xs">
                {loading ? 'ANALYZING...' : token?.analysis ? token.analysis.verdict : 'SCANNING'}
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
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-2 border-skull-blood border-t-transparent rounded-full mx-auto mb-4"
              />
              <p className="text-skull-blood text-sm">analyzing token...</p>
              <p className="text-skull-text-dim mt-2 text-xs">running deep analysis</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-skull-blood mx-auto mb-4" />
              <p className="text-skull-blood text-sm">{error}</p>
              <p className="text-skull-text-dim text-xs mt-2">CA: {ca.slice(0, 20)}...</p>
              <button
                onClick={fetchTokenData}
                className="mt-4 px-4 py-2 border border-skull-blood text-skull-blood rounded hover:bg-skull-blood/20 text-xs"
              >
                RETRY
              </button>
            </div>
          ) : token ? (
            <div className="flex flex-col max-h-[calc(90vh-60px)]">
              {/* Token Header with Score */}
              <div className="p-4 border-b border-skull-border">
                <div className="flex items-start gap-4">
                  {token.image ? (
                    <img
                      src={token.image}
                      alt={token.symbol}
                      className="w-16 h-16 rounded-lg border border-skull-border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect fill="%231a1a1a" width="64" height="64"/><text x="32" y="40" text-anchor="middle" fill="%23666">?</text></svg>'
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-skull-border flex items-center justify-center text-skull-text-dim text-2xl bg-skull-border/20">
                      ?
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl text-skull-text-bright font-bold">{token.name}</h2>
                    <p className="text-skull-text-dim text-sm">${token.symbol}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-skull-text-dim text-xs">{formatMcap(token.usdMarketCap)}</span>
                      {token.complete && (
                        <span className="text-[10px] px-2 py-0.5 bg-green-400/20 border border-green-400 text-green-400 rounded">
                          GRADUATED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Big Score Display */}
                  {token.analysis && (
                    <div className={`text-center p-3 rounded-lg border ${getVerdictColor(token.analysis.verdict)} ${getVerdictBg(token.analysis.verdict)}`}>
                      <div className={`text-3xl font-bold ${getScoreColor(token.analysis.score)}`}>
                        {token.analysis.score}
                      </div>
                      <div className={`text-xs font-bold ${getVerdictColor(token.analysis.verdict).split(' ')[0]}`}>
                        {token.analysis.verdict}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-skull-border">
                {['overview', 'analysis', 'signals', 'ca'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSection(tab as any)}
                    className={`flex-1 py-2 text-xs transition-colors ${
                      activeSection === tab
                        ? 'tab-active'
                        : 'tab-inactive'
                    }`}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* OVERVIEW TAB */}
                {activeSection === 'overview' && (
                  <div className="space-y-4">
                    {/* Recommendation Box */}
                    {token.analysis && (
                      <div className={`p-3 rounded-lg border ${getVerdictColor(token.analysis.verdict)} ${getVerdictBg(token.analysis.verdict)}`}>
                        <p className="text-xs">{token.analysis.recommendation}</p>
                      </div>
                    )}

                    {/* Description */}
                    {token.description && (
                      <div className="bg-void border border-skull-border rounded-lg p-3">
                        <p className="text-skull-text-dim text-xs leading-relaxed">
                          {token.description}
                        </p>
                      </div>
                    )}

                    {/* CA Box */}
                    <div className="bg-void border border-skull-border rounded-lg p-3">
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
                            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-skull-text-dim" />}
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

                    {/* Quick Links */}
                    <div className="flex gap-2">
                      <a
                        href={`https://pump.fun/${ca}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-3 border border-skull-border rounded hover:border-skull-blood hover:bg-skull-blood/10 text-skull-text text-sm font-medium transition-colors"
                      >
                        PUMP.FUN
                      </a>
                      <a
                        href={`https://dexscreener.com/solana/${ca}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-3 border border-skull-border rounded hover:border-skull-blood hover:bg-skull-blood/10 text-skull-text text-sm font-medium transition-colors"
                      >
                        DEXSCREENER
                      </a>
                    </div>
                  </div>
                )}

                {/* ANALYSIS TAB */}
                {activeSection === 'analysis' && token.analysis && (
                  <div className="space-y-4">
                    {/* Score Breakdown */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-void border border-skull-border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp size={14} className="text-skull-blood" />
                          <span className="text-[10px] text-skull-text-dim">NARRATIVE</span>
                        </div>
                        <div className={`text-xl font-bold ${getScoreColor(token.analysis.narrativeScore)}`}>
                          {token.analysis.narrativeScore}
                        </div>
                        <div className="h-1 bg-skull-border rounded mt-2">
                          <div
                            className={`h-full rounded ${getScoreBarColor(token.analysis.narrativeScore)}`}
                            style={{ width: `${token.analysis.narrativeScore}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-void border border-skull-border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Users size={14} className="text-skull-blood" />
                          <span className="text-[10px] text-skull-text-dim">SOCIAL</span>
                        </div>
                        <div className={`text-xl font-bold ${getScoreColor(token.analysis.socialScore)}`}>
                          {token.analysis.socialScore}
                        </div>
                        <div className="h-1 bg-skull-border rounded mt-2">
                          <div
                            className={`h-full rounded ${getScoreBarColor(token.analysis.socialScore)}`}
                            style={{ width: `${token.analysis.socialScore}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-void border border-skull-border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield size={14} className="text-skull-blood" />
                          <span className="text-[10px] text-skull-text-dim">RISK</span>
                        </div>
                        <div className={`text-xl font-bold ${getScoreColor(token.analysis.riskScore)}`}>
                          {token.analysis.riskScore}
                        </div>
                        <div className="h-1 bg-skull-border rounded mt-2">
                          <div
                            className={`h-full rounded ${getScoreBarColor(token.analysis.riskScore)}`}
                            style={{ width: `${token.analysis.riskScore}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Green Flags */}
                    {token.analysis.greenFlags.length > 0 && (
                      <div className="bg-green-400/5 border border-green-400/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle size={14} className="text-green-400" />
                          <span className="text-green-400 text-xs font-bold">POSITIVE SIGNALS</span>
                        </div>
                        <ul className="space-y-1">
                          {token.analysis.greenFlags.map((flag, i) => (
                            <li key={i} className="text-green-400/80 text-xs flex items-center gap-2">
                              <span className="text-green-400">+</span> {flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Red Flags */}
                    {token.analysis.redFlags.length > 0 && (
                      <div className="bg-red-500/5 border border-red-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle size={14} className="text-red-500" />
                          <span className="text-red-500 text-xs font-bold">WARNING SIGNALS</span>
                        </div>
                        <ul className="space-y-1">
                          {token.analysis.redFlags.map((flag, i) => (
                            <li key={i} className="text-red-500/80 text-xs flex items-center gap-2">
                              <span className="text-red-500">!</span> {flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* SIGNALS TAB */}
                {activeSection === 'signals' && token.analysis && (
                  <div className="space-y-2">
                    {token.analysis.signals.map((signal, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded border text-xs ${
                          signal.type === 'positive'
                            ? 'border-green-400/30 bg-green-400/5'
                            : signal.type === 'negative'
                            ? 'border-red-500/30 bg-red-500/5'
                            : 'border-skull-border bg-skull-border/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${
                              signal.type === 'positive' ? 'text-green-400' :
                              signal.type === 'negative' ? 'text-red-500' : 'text-skull-text-dim'
                            }`}>
                              {signal.type === 'positive' ? '+' : signal.type === 'negative' ? '-' : '○'}
                            </span>
                            <span className="text-skull-text-dim">[{signal.category}]</span>
                            <span className="text-skull-text">{signal.message}</span>
                          </div>
                          <span className={`font-mono ${
                            signal.weight > 0 ? 'text-green-400' :
                            signal.weight < 0 ? 'text-red-500' : 'text-skull-text-dim'
                          }`}>
                            {signal.weight > 0 ? '+' : ''}{signal.weight}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* CA TAB */}
                {activeSection === 'ca' && (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <p className="text-skull-text-dim text-xs mb-2">CONTRACT ADDRESS</p>
                      <h3 className="text-skull-text-bright text-lg font-bold">{token.symbol}</h3>
                    </div>

                    {/* Big CA Display */}
                    <div
                      onClick={copyToClipboard}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all text-center ${
                        copied
                          ? 'bg-green-500/20 border-green-500'
                          : 'border-skull-border hover:border-skull-blood hover:bg-skull-blood/10'
                      }`}
                    >
                      <p className={`font-mono text-sm break-all ${copied ? 'text-green-500' : 'text-skull-text'}`}>
                        {ca}
                      </p>
                      <p className={`text-xs mt-3 ${copied ? 'text-green-500' : 'text-skull-text-dim'}`}>
                        {copied ? '✓ COPIED TO CLIPBOARD!' : 'CLICK TO COPY'}
                      </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <a
                        href={`https://pump.fun/${ca}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 text-center border border-skull-border rounded-lg hover:border-skull-blood hover:bg-skull-blood/10 transition-colors"
                      >
                        <p className="text-skull-text font-medium">PUMP.FUN</p>
                        <p className="text-skull-text-dim text-[10px] mt-1">View on pump.fun</p>
                      </a>
                      <a
                        href={`https://dexscreener.com/solana/${ca}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 text-center border border-skull-border rounded-lg hover:border-skull-blood hover:bg-skull-blood/10 transition-colors"
                      >
                        <p className="text-skull-text font-medium">DEXSCREENER</p>
                        <p className="text-skull-text-dim text-[10px] mt-1">View chart</p>
                      </a>
                    </div>

                    {/* Token Info */}
                    <div className="bg-void border border-skull-border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-skull-text-dim">Name</span>
                        <span className="text-skull-text">{token.name}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-skull-text-dim">Symbol</span>
                        <span className="text-skull-text">${token.symbol}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-skull-text-dim">Market Cap</span>
                        <span className="text-skull-text">{formatMcap(token.usdMarketCap)}</span>
                      </div>
                      {token.complete && (
                        <div className="flex justify-between text-xs">
                          <span className="text-skull-text-dim">Status</span>
                          <span className="text-green-400">GRADUATED</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer with final verdict */}
              {token.analysis && (
                <div className={`p-3 border-t border-skull-border ${getVerdictBg(token.analysis.verdict)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${getVerdictColor(token.analysis.verdict).split(' ')[0]}`}>
                        {token.analysis.verdict}
                      </span>
                      <span className="text-skull-text-dim text-xs">|</span>
                      <span className="text-skull-text-dim text-xs">
                        Score: <span className={getScoreColor(token.analysis.score)}>{token.analysis.score}/100</span>
                      </span>
                    </div>
                    <div className="flex gap-2 text-[10px]">
                      <span className="text-green-400">{token.analysis.greenFlags.length} green</span>
                      <span className="text-skull-text-dim">|</span>
                      <span className="text-red-500">{token.analysis.redFlags.length} red</span>
                    </div>
                  </div>
                </div>
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
