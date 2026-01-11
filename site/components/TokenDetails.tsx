'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Token, SniperLog, supabase } from '@/lib/supabase'
import { X, ExternalLink, Copy, Check, TrendingUp, TrendingDown, Droplets, Users, Target } from 'lucide-react'

interface TokenDetailsProps {
  ca: string
  onClose: () => void
}

export default function TokenDetails({ ca, onClose }: TokenDetailsProps) {
  const [token, setToken] = useState<Token | null>(null)
  const [logs, setLogs] = useState<SniperLog[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchTokenData()
  }, [ca])

  async function fetchTokenData() {
    setLoading(true)

    // Fetch token
    const { data: tokenData } = await supabase
      .from('tokens')
      .select('*')
      .eq('ca', ca)
      .single()

    // Fetch logs
    const { data: logsData } = await supabase
      .from('sniper_logs')
      .select('*')
      .eq('ca', ca)
      .order('timestamp', { ascending: false })
      .limit(20)

    setToken(tokenData)
    setLogs(logsData || [])
    setLoading(false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(ca)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getVerdictColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'excellent': return 'text-green-400'
      case 'good': return 'text-yellow-400'
      case 'approved': return 'text-skull-green'
      case 'sniped': return 'text-purple-400'
      case 'risky': return 'text-orange-400'
      case 'avoid':
      case 'rejected': return 'text-skull-blood'
      default: return 'text-gray-400'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 65) return 'text-yellow-400'
    if (score >= 50) return 'text-orange-400'
    return 'text-skull-blood'
  }

  const formatMcap = (value: number) => {
    if (!value) return '$0'
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
    return `$${value.toFixed(2)}`
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionEmoji = (action: string) => {
    switch (action) {
      case 'DETECTED': return '👁️'
      case 'APPROVED': return '✅'
      case 'REJECTED': return '❌'
      case 'SNIPING': return '🎯'
      case 'SNIPE_SUCCESS': return '🩸'
      case 'SNIPE_FAILED': return '💀'
      case 'TAKE_PROFIT': return '💰'
      case 'STOP_LOSS': return '☠️'
      default: return '⚪'
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="terminal rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="terminal-header p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-skull-green text-sm">TOKEN DETAILS</span>
              <span className="text-gray-500">|</span>
              <span className={`text-sm ${getVerdictColor(token?.status || '')}`}>
                {token?.status?.toUpperCase() || 'LOADING'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-skull-blood transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block text-2xl"
              >
                💀
              </motion.div>
              <p className="text-gray-500 mt-2">Loading...</p>
            </div>
          ) : token ? (
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
              {/* Token Info */}
              <div className="flex items-start gap-4 mb-6">
                {token.logo ? (
                  <img
                    src={token.logo}
                    alt={token.simbolo}
                    className="w-16 h-16 rounded-lg border border-skull-green/30"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-skull-green/30 flex items-center justify-center text-2xl">
                    💀
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-xl text-skull-green font-bold">
                    {token.nome}
                  </h2>
                  <p className="text-gray-500">${token.simbolo}</p>
                </div>
                {token.score > 0 && (
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(token.score)}`}>
                      {token.score}
                    </div>
                    <div className="text-xs text-gray-500">SCORE</div>
                  </div>
                )}
              </div>

              {/* CA Box */}
              <div className="bg-skull-dark border border-skull-green/30 rounded-lg p-3 mb-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-gray-500 mb-1">Contract Address</p>
                    <p className="text-skull-green font-mono text-sm truncate">{ca}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="p-2 border border-skull-green/30 rounded hover:bg-skull-green/10 transition-colors"
                    >
                      {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-skull-green" />}
                    </button>
                    <a
                      href={`https://pump.fun/${ca}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 border border-skull-green/30 rounded hover:bg-skull-green/10 transition-colors"
                    >
                      <ExternalLink size={16} className="text-skull-green" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-skull-dark border border-skull-green/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <TrendingUp size={14} />
                    Market Cap
                  </div>
                  <div className="text-skull-green font-bold">
                    {formatMcap(token.market_cap)}
                  </div>
                </div>
                <div className="bg-skull-dark border border-skull-green/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Droplets size={14} />
                    Liquidity
                  </div>
                  <div className="text-skull-green font-bold">
                    {formatMcap(token.liquidity)}
                  </div>
                </div>
                <div className="bg-skull-dark border border-skull-green/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Users size={14} />
                    Holders
                  </div>
                  <div className="text-skull-green font-bold">
                    {token.holders || 0}
                  </div>
                </div>
                <div className="bg-skull-dark border border-skull-green/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Target size={14} />
                    Status
                  </div>
                  <div className={`font-bold ${getVerdictColor(token.status)}`}>
                    {token.status?.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Reject Reason */}
              {token.reject_reason && (
                <div className="bg-skull-blood/20 border border-skull-blood/50 rounded-lg p-3 mb-6">
                  <p className="text-skull-blood text-sm">
                    <span className="font-bold">Rejection Reason:</span> {token.reject_reason}
                  </p>
                </div>
              )}

              {/* Activity Log */}
              <div className="border border-skull-green/30 rounded-lg overflow-hidden">
                <div className="bg-skull-dark px-3 py-2 border-b border-skull-green/30">
                  <span className="text-skull-green text-sm">Activity Log</span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {logs.length > 0 ? (
                    logs.map((log, i) => (
                      <div
                        key={log.id || i}
                        className="px-3 py-2 border-b border-skull-green/10 last:border-0 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span>{getActionEmoji(log.action)}</span>
                          <span className="text-skull-green">{log.action}</span>
                          <span className="text-gray-600 ml-auto">{formatTime(log.timestamp)}</span>
                        </div>
                        {log.reason && (
                          <p className="text-gray-500 mt-1 pl-6">{log.reason}</p>
                        )}
                        {log.tx_signature && (
                          <a
                            href={`https://solscan.io/tx/${log.tx_signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline mt-1 pl-6 block"
                          >
                            TX: {log.tx_signature.slice(0, 16)}...
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No activity yet
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Links */}
              <div className="flex gap-2 mt-4">
                <a
                  href={`https://pump.fun/${ca}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2 border border-skull-green/30 rounded hover:bg-skull-green/10 text-skull-green text-sm transition-colors"
                >
                  PumpFun
                </a>
                <a
                  href={`https://dexscreener.com/solana/${ca}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2 border border-skull-green/30 rounded hover:bg-skull-green/10 text-skull-green text-sm transition-colors"
                >
                  DexScreener
                </a>
                <a
                  href={`https://birdeye.so/token/${ca}?chain=solana`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2 border border-skull-green/30 rounded hover:bg-skull-green/10 text-skull-green text-sm transition-colors"
                >
                  Birdeye
                </a>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-skull-blood">Token not found</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
