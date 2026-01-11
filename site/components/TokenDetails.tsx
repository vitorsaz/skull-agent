'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Token, SniperLog, supabase } from '@/lib/supabase'
import { X, ExternalLink, Copy, Check } from 'lucide-react'

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

    const { data: tokenData } = await supabase
      .from('tokens')
      .select('*')
      .eq('ca', ca)
      .single()

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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'excellent':
      case 'good':
      case 'approved':
      case 'sniped': return 'text-skull-text-bright'
      case 'risky':
      case 'avoid':
      case 'rejected': return 'text-skull-blood'
      default: return 'text-skull-text'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-skull-text-bright'
    if (score >= 65) return 'text-skull-text'
    if (score >= 50) return 'text-skull-blood'
    return 'text-red-800'
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
      case 'DETECTED': return '[ ]'
      case 'APPROVED': return '[+]'
      case 'REJECTED': return '[x]'
      case 'SNIPING': return '[>]'
      case 'SNIPE_SUCCESS': return '[*]'
      case 'SNIPE_FAILED': return '[!]'
      case 'TAKE_PROFIT': return '[$]'
      case 'STOP_LOSS': return '[-]'
      default: return '[ ]'
    }
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
              <span className={`text-xs ${getStatusColor(token?.status || '')}`}>
                {token?.status?.toUpperCase() || 'LOADING'}
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
              <p className="text-skull-text-dim mt-2 text-xs">loading</p>
            </div>
          ) : token ? (
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
              {/* Token Info */}
              <div className="flex items-start gap-4 mb-6">
                {token.logo ? (
                  <img
                    src={token.logo}
                    alt={token.simbolo}
                    className="w-14 h-14 rounded-lg border border-skull-border opacity-80"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg border border-skull-border flex items-center justify-center text-skull-text-dim text-xl">
                    ?
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-lg text-skull-text-bright font-bold">
                    {token.nome}
                  </h2>
                  <p className="text-skull-text-dim text-sm">${token.simbolo}</p>
                </div>
                {token.score > 0 && (
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getScoreColor(token.score)}`}>
                      {token.score}
                    </div>
                    <div className="text-[10px] text-skull-text-dim">SCORE</div>
                  </div>
                )}
              </div>

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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                <div className="bg-void border border-skull-border rounded-lg p-3">
                  <div className="text-skull-text-dim text-[10px] mb-1">MCAP</div>
                  <div className="text-skull-text text-sm font-medium">
                    {formatMcap(token.market_cap)}
                  </div>
                </div>
                <div className="bg-void border border-skull-border rounded-lg p-3">
                  <div className="text-skull-text-dim text-[10px] mb-1">LIQUIDITY</div>
                  <div className="text-skull-text text-sm font-medium">
                    {formatMcap(token.liquidity)}
                  </div>
                </div>
                <div className="bg-void border border-skull-border rounded-lg p-3">
                  <div className="text-skull-text-dim text-[10px] mb-1">HOLDERS</div>
                  <div className="text-skull-text text-sm font-medium">
                    {token.holders || 0}
                  </div>
                </div>
                <div className="bg-void border border-skull-border rounded-lg p-3">
                  <div className="text-skull-text-dim text-[10px] mb-1">STATUS</div>
                  <div className={`text-sm font-medium ${getStatusColor(token.status)}`}>
                    {token.status?.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Reject Reason */}
              {token.reject_reason && (
                <div className="bg-skull-blood/10 border border-skull-blood/30 rounded-lg p-3 mb-6">
                  <p className="text-skull-blood text-xs">
                    <span className="font-bold">REJECTED:</span> {token.reject_reason}
                  </p>
                </div>
              )}

              {/* Activity Log */}
              <div className="border border-skull-border rounded-lg overflow-hidden">
                <div className="bg-dark px-3 py-2 border-b border-skull-border">
                  <span className="text-skull-text-dim text-xs">ACTIVITY LOG</span>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {logs.length > 0 ? (
                    logs.map((log, i) => (
                      <div
                        key={log.id || i}
                        className="px-3 py-2 border-b border-skull-border/50 last:border-0 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-skull-text-dim">{getActionEmoji(log.action)}</span>
                          <span className="text-skull-text">{log.action}</span>
                          <span className="text-skull-text-dim ml-auto">{formatTime(log.timestamp)}</span>
                        </div>
                        {log.reason && (
                          <p className="text-skull-text-dim mt-1 pl-6">{log.reason}</p>
                        )}
                        {log.tx_signature && (
                          <a
                            href={`https://solscan.io/tx/${log.tx_signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-skull-blood hover:underline mt-1 pl-6 block"
                          >
                            TX: {log.tx_signature.slice(0, 12)}...
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-skull-text-dim text-xs">
                      no activity
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
