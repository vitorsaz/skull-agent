'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { getPumpPortalSocket, LiveToken, TradeUpdate, calculateScore } from '@/lib/pumpportal'
import TokenDetails from './TokenDetails'

const SKULL_LOGO_URL = 'https://media.discordapp.net/attachments/1454587961642582039/1459762883562049639/image.png?ex=696475a0&is=69632420&hm=522e0130286a30691dd624369482c5103266686216d3c0945843f54b54de43a4&=&format=webp&quality=lossless'

interface LogEntry {
  id: string
  action: string
  ca: string
  name: string
  symbol: string
  mcap: number
  score: number
  status: string
  timestamp: number
}

export default function Terminal() {
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected')
  const [tokens, setTokens] = useState<LiveToken[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [activeTab, setActiveTab] = useState<'feed' | 'tokens' | 'ca' | 'stats'>('feed')
  const [commandInput, setCommandInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [selectedCA, setSelectedCA] = useState<string | null>(null)
  const [caInput, setCaInput] = useState('')
  const [stats, setStats] = useState({
    tokensScanned: 0,
    excellent: 0,
    good: 0,
    risky: 0,
    avoid: 0,
    trades: 0
  })
  const logsEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<ReturnType<typeof getPumpPortalSocket> | null>(null)

  useEffect(() => {
    // Connect to PumpPortal WebSocket
    const socket = getPumpPortalSocket()
    socketRef.current = socket

    socket.onStatus(setWsStatus)

    socket.onToken((token) => {
      // Add to tokens list
      setTokens(prev => {
        const exists = prev.find(t => t.mint === token.mint)
        if (exists) return prev
        return [token, ...prev.slice(0, 99)]
      })

      // Create log entry
      const logEntry: LogEntry = {
        id: `${token.mint}-${Date.now()}`,
        action: 'DETECTED',
        ca: token.mint,
        name: token.name,
        symbol: token.symbol,
        mcap: token.marketCapUsd || 0,
        score: token.score || 50,
        status: token.status || 'SCANNING',
        timestamp: token.timestamp
      }

      setLogs(prev => [logEntry, ...prev.slice(0, 199)])

      // Update stats
      setStats(prev => ({
        ...prev,
        tokensScanned: prev.tokensScanned + 1,
        excellent: prev.excellent + (token.status === 'EXCELLENT' ? 1 : 0),
        good: prev.good + (token.status === 'GOOD' ? 1 : 0),
        risky: prev.risky + (token.status === 'RISKY' ? 1 : 0),
        avoid: prev.avoid + (token.status === 'AVOID' ? 1 : 0)
      }))
    })

    // Handle trade updates for real-time market cap
    socket.onTrade((trade: TradeUpdate) => {
      setTokens(prev => prev.map(token => {
        if (token.mint === trade.mint) {
          return {
            ...token,
            marketCapSol: trade.marketCapSol,
            marketCapUsd: trade.marketCapUsd,
            vSolInBondingCurve: trade.vSolInBondingCurve,
            vTokensInBondingCurve: trade.vTokensInBondingCurve
          }
        }
        return token
      }))

      // Update trades count
      setStats(prev => ({ ...prev, trades: prev.trades + 1 }))

      // Add trade to logs
      setLogs(prev => {
        const token = prev.find(l => l.ca === trade.mint)
        if (token) {
          const tradeLog: LogEntry = {
            id: `${trade.mint}-${Date.now()}-trade`,
            action: trade.txType.toUpperCase(),
            ca: trade.mint,
            name: token.name,
            symbol: token.symbol,
            mcap: trade.marketCapUsd,
            score: token.score,
            status: token.status,
            timestamp: trade.timestamp
          }
          return [tradeLog, ...prev.slice(0, 199)]
        }
        return prev
      })
    })

    socket.connect()

    return () => {
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'feed') {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, activeTab])

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commandInput.trim()) return

    const cmd = commandInput.toLowerCase().trim()
    let response = ''

    switch (cmd) {
      case 'help':
        response = `
[COMMANDS]
  status    - connection status
  stats     - scanning statistics
  clear     - clear terminal
  about     - about skull agent
  reconnect - reconnect websocket
`
        break
      case 'status':
        response = `
[CONNECTION STATUS]
  WebSocket: ${wsStatus.toUpperCase()}
  Tokens in memory: ${tokens.length}
  Logs: ${logs.length}
`
        break
      case 'stats':
        response = `
[SCAN STATISTICS]
  Total scanned: ${stats.tokensScanned}
  Excellent: ${stats.excellent}
  Good: ${stats.good}
  Risky: ${stats.risky}
  Avoid: ${stats.avoid}
`
        break
      case 'reconnect':
        socketRef.current?.disconnect()
        setTimeout(() => socketRef.current?.connect(), 1000)
        response = '[RECONNECTING...]'
        break
      case 'about':
        response = `
[SKULL AGENT v3.0]
  live token scanner for pump.fun
  darkweb edition

  real-time websocket feed
  autonomous analysis

  hunt or be hunted.
`
        break
      case 'clear':
        setCommandHistory([])
        setCommandInput('')
        return
      default:
        response = `[ERROR] unknown command: ${cmd}`
    }

    setCommandHistory(prev => [...prev, `> ${commandInput}`, response])
    setCommandInput('')
  }

  const handleCASearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (caInput.trim().length >= 32) {
      setSelectedCA(caInput.trim())
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatMcap = (value: number) => {
    if (!value) return '$0'
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'EXCELLENT': return 'text-skull-text-bright border-skull-text-bright'
      case 'GOOD': return 'text-skull-text border-skull-text'
      case 'RISKY': return 'text-skull-blood border-skull-blood'
      case 'AVOID': return 'text-red-800 border-red-800'
      default: return 'text-skull-text-dim border-skull-border'
    }
  }

  const getScoreIndicator = (score: number) => {
    if (score >= 80) return { color: 'bg-skull-text-bright', label: 'A' }
    if (score >= 65) return { color: 'bg-skull-text', label: 'B' }
    if (score >= 50) return { color: 'bg-skull-blood', label: 'C' }
    return { color: 'bg-red-900', label: 'D' }
  }

  const getActionEmoji = (action: string) => {
    switch (action?.toUpperCase()) {
      case 'DETECTED': return '[◆]'
      case 'BUY': return '[▲]'
      case 'SELL': return '[▼]'
      case 'EXCELLENT': return '[★]'
      case 'GOOD': return '[+]'
      case 'RISKY': return '[!]'
      case 'AVOID': return '[X]'
      default: return '[ ]'
    }
  }

  const getActionColor = (action: string) => {
    switch (action?.toUpperCase()) {
      case 'DETECTED': return 'text-skull-text-bright'
      case 'BUY': return 'text-green-500'
      case 'SELL': return 'text-skull-blood'
      default: return 'text-skull-text-dim'
    }
  }

  return (
    <div className="min-h-screen bg-void p-2 md:p-4 noise">
      {/* Blood drips */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="blood-drip" />
      ))}

      {/* Vignette */}
      <div className="vignette" />

      {/* Token Details Modal */}
      {selectedCA && (
        <TokenDetails ca={selectedCA} onClose={() => setSelectedCA(null)} />
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header with Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="terminal rounded-lg overflow-hidden mb-4"
        >
          <div className="terminal-header p-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-skull-blood" />
              <div className="w-2.5 h-2.5 rounded-full bg-skull-text-dim" />
              <div className="w-2.5 h-2.5 rounded-full bg-skull-text-dim" />
            </div>
            <span className="text-skull-text-dim text-xs ml-2">skull-agent@darkweb</span>
            <span className="text-skull-text-dim text-xs ml-auto">
              {wsStatus === 'connected' ? (
                <span className="text-skull-blood">● LIVE</span>
              ) : wsStatus === 'connecting' ? (
                <span className="text-skull-text-dim">○ CONNECTING...</span>
              ) : (
                <span className="text-red-800">○ OFFLINE</span>
              )}
            </span>
          </div>

          <div className="p-6">
            {/* Logo and Title */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <img
                src={SKULL_LOGO_URL}
                alt="SKULL AGENT"
                className="w-24 h-24 md:w-32 md:h-32 rounded-lg opacity-90"
              />
              <div>
                <h1 className="text-2xl md:text-4xl font-bold text-skull-text-bright tracking-wider">
                  SKULL AGENT
                </h1>
                <p className="text-skull-blood text-sm md:text-base tracking-[0.3em] mt-1">
                  LIVE TOKEN SCANNER
                </p>
                <p className="text-skull-text-dim text-xs mt-2">
                  pump.fun darkweb terminal v3.0
                </p>
              </div>
            </div>

            {/* Status bar */}
            <div className="flex flex-wrap justify-center gap-6 text-xs border-t border-skull-border pt-4">
              <div className="flex items-center gap-2">
                <span className="text-skull-text-dim">STATUS</span>
                <span className={wsStatus === 'connected' ? 'text-skull-blood' : 'text-skull-text-dim'}>
                  {wsStatus === 'connected' ? 'HUNTING' : wsStatus.toUpperCase()}
                </span>
                <motion.span
                  className="text-skull-blood text-[8px]"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {wsStatus === 'connected' ? '●' : '○'}
                </motion.span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-skull-text-dim">SCANNED</span>
                <span className="text-skull-text">{stats.tokensScanned}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-skull-text-dim">EXCELLENT</span>
                <span className="text-skull-text-bright">{stats.excellent}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-skull-text-dim">GOOD</span>
                <span className="text-skull-text">{stats.good}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-skull-text-dim">RISKY</span>
                <span className="text-skull-blood">{stats.risky}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-skull-text-dim">TRADES</span>
                <span className="text-green-500">{stats.trades}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 terminal rounded-lg overflow-hidden"
          >
            <div className="terminal-header p-2 flex items-center justify-between">
              <div className="flex gap-1">
                {['feed', 'tokens', 'ca', 'stats'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      activeTab === tab
                        ? 'tab-active'
                        : 'tab-inactive'
                    }`}
                  >
                    {tab === 'ca' ? 'CA' : tab.toUpperCase()}
                  </button>
                ))}
              </div>
              <span className="text-skull-text-dim text-xs">
                {tokens.length} targets
              </span>
            </div>

            <div className="h-96 overflow-y-auto p-4 font-mono text-xs">
              {/* LIVE FEED */}
              {activeTab === 'feed' && (
                <div className="space-y-1">
                  {logs.length === 0 ? (
                    <div className="text-skull-text-dim text-center py-8">
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        waiting for tokens...
                      </motion.div>
                    </div>
                  ) : (
                    logs.slice(0, 50).map((log, i) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex gap-2 hover:bg-skull-border/20 px-1 py-0.5 rounded cursor-pointer"
                        onClick={() => setSelectedCA(log.ca)}
                      >
                        <span className="text-skull-text-dim">{formatTime(log.timestamp)}</span>
                        <span className={getActionColor(log.action)}>{getActionEmoji(log.action)}</span>
                        <span className={getActionColor(log.action)}>{log.action}</span>
                        <span className="text-skull-text-bright">{log.symbol}</span>
                        <span className="text-skull-text-dim truncate max-w-[80px]">{log.name}</span>
                        <span className={log.action === 'BUY' ? 'text-green-500' : log.action === 'SELL' ? 'text-skull-blood' : 'text-skull-text-dim'}>
                          {formatMcap(log.mcap)}
                        </span>
                        {log.action === 'DETECTED' && (
                          <span className={`${getStatusColor(log.status).split(' ')[0]}`}>
                            [{log.score}] {log.status}
                          </span>
                        )}
                      </motion.div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              )}

              {/* TOKENS */}
              {activeTab === 'tokens' && (
                <div className="space-y-2">
                  {tokens.length === 0 ? (
                    <div className="text-skull-text-dim text-center py-8">
                      no tokens detected yet
                    </div>
                  ) : (
                    tokens.map((token, i) => {
                      const scoreInfo = getScoreIndicator(token.score || 50)
                      return (
                        <motion.div
                          key={token.mint}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="token-card p-3 rounded cursor-pointer"
                          onClick={() => setSelectedCA(token.mint)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              {token.logo ? (
                                <img src={token.logo} alt="" className="w-8 h-8 rounded opacity-80" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-skull-border flex items-center justify-center text-skull-text-dim text-xs">
                                  ?
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-skull-text-bright font-medium">{token.symbol}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 border rounded ${getStatusColor(token.status || '')}`}>
                                    {token.status}
                                  </span>
                                </div>
                                <span className="text-skull-text-dim text-xs">{token.name?.slice(0, 20)}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-skull-text">{formatMcap(token.marketCapUsd || 0)}</div>
                              <div className="flex items-center gap-1 justify-end mt-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${scoreInfo.color}`} />
                                <span className="text-skull-text-dim text-[10px]">{token.score}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-skull-text-dim text-[10px] mt-2 font-mono truncate">
                            {token.mint}
                          </div>
                          <div className="flex gap-4 mt-2 text-[10px] text-skull-text-dim">
                            <span>Initial: {(token.initialBuy / 1e9).toFixed(2)} SOL</span>
                            <span>Liq: {(token.vSolInBondingCurve / 1e9).toFixed(2)} SOL</span>
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </div>
              )}

              {/* CA LOOKUP */}
              {activeTab === 'ca' && (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <img
                      src={SKULL_LOGO_URL}
                      alt="CA Lookup"
                      className="w-16 h-16 mx-auto mb-4 opacity-60"
                    />
                    <h3 className="text-skull-text-bright text-sm mb-1">CONTRACT LOOKUP</h3>
                    <p className="text-skull-text-dim text-xs">
                      enter contract address
                    </p>
                  </div>

                  <form onSubmit={handleCASearch} className="flex gap-2">
                    <input
                      type="text"
                      value={caInput}
                      onChange={(e) => setCaInput(e.target.value)}
                      placeholder="paste contract address..."
                      className="flex-1 bg-void border border-skull-border rounded px-3 py-2 text-skull-text font-mono text-xs focus:outline-none focus:border-skull-blood"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-skull-blood/20 border border-skull-blood text-skull-blood rounded hover:bg-skull-blood/30 text-xs transition-colors"
                    >
                      SEARCH
                    </button>
                  </form>

                  <div className="border-t border-skull-border pt-4">
                    <h4 className="text-skull-text-dim text-xs mb-2">RECENT DETECTIONS</h4>
                    <div className="space-y-1">
                      {tokens.slice(0, 8).map((token) => (
                        <div
                          key={token.mint}
                          onClick={() => setSelectedCA(token.mint)}
                          className="flex items-center justify-between p-2 border border-skull-border rounded hover:border-skull-blood/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${getScoreIndicator(token.score || 50).color}`} />
                            <span className="text-skull-text text-xs">{token.symbol}</span>
                            <span className="text-skull-text-dim text-[10px]">{token.mint?.slice(0, 6)}...{token.mint?.slice(-4)}</span>
                          </div>
                          <span className="text-skull-text-dim text-xs">{formatMcap(token.marketCapUsd || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STATS */}
              {activeTab === 'stats' && (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <h3 className="text-skull-text-bright text-sm mb-4">SCAN STATISTICS</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-void border border-skull-border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-skull-text-bright">{stats.tokensScanned}</div>
                      <div className="text-[10px] text-skull-text-dim mt-1">TOTAL SCANNED</div>
                    </div>
                    <div className="bg-void border border-skull-border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-skull-text-bright">{stats.excellent}</div>
                      <div className="text-[10px] text-skull-text-dim mt-1">EXCELLENT</div>
                    </div>
                    <div className="bg-void border border-skull-border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-skull-text">{stats.good}</div>
                      <div className="text-[10px] text-skull-text-dim mt-1">GOOD</div>
                    </div>
                    <div className="bg-void border border-skull-border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-skull-blood">{stats.risky}</div>
                      <div className="text-[10px] text-skull-text-dim mt-1">RISKY</div>
                    </div>
                    <div className="bg-void border border-skull-border rounded-lg p-4 text-center col-span-2">
                      <div className="text-2xl font-bold text-red-800">{stats.avoid}</div>
                      <div className="text-[10px] text-skull-text-dim mt-1">AVOID</div>
                    </div>
                  </div>

                  <div className="border-t border-skull-border pt-4">
                    <h4 className="text-skull-text-dim text-xs mb-2">SCORE BREAKDOWN</h4>
                    <div className="space-y-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-skull-text-dim">Excellent rate:</span>
                        <span className="text-skull-text-bright">
                          {stats.tokensScanned > 0 ? ((stats.excellent / stats.tokensScanned) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-skull-text-dim">Good+ rate:</span>
                        <span className="text-skull-text">
                          {stats.tokensScanned > 0 ? (((stats.excellent + stats.good) / stats.tokensScanned) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-skull-text-dim">Avoid rate:</span>
                        <span className="text-skull-blood">
                          {stats.tokensScanned > 0 ? ((stats.avoid / stats.tokensScanned) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right panel - Command terminal */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="terminal rounded-lg overflow-hidden"
          >
            <div className="terminal-header p-2">
              <span className="text-skull-text-dim text-xs">TERMINAL</span>
            </div>

            <div className="h-96 flex flex-col">
              <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px]">
                <div className="text-skull-text-dim mb-3">
                  type 'help' for commands
                </div>
                {commandHistory.map((line, i) => (
                  <div key={i} className="text-skull-text whitespace-pre-wrap leading-relaxed">
                    {line}
                  </div>
                ))}
              </div>

              <form onSubmit={handleCommand} className="p-2 border-t border-skull-border">
                <div className="flex items-center gap-2">
                  <span className="text-skull-blood">&gt;</span>
                  <input
                    type="text"
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    className="terminal-input flex-1 text-xs"
                    placeholder=""
                  />
                  <motion.span
                    className="text-skull-blood"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    _
                  </motion.span>
                </div>
              </form>
            </div>
          </motion.div>
        </div>

        {/* Live indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 terminal rounded-lg p-4"
        >
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <motion.div
                className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-skull-blood' : 'bg-skull-text-dim'}`}
                animate={wsStatus === 'connected' ? { opacity: [1, 0.3, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className={wsStatus === 'connected' ? 'text-skull-blood' : 'text-skull-text-dim'}>
                {wsStatus === 'connected' ? 'LIVE FEED ACTIVE' : 'CONNECTING TO PUMPPORTAL...'}
              </span>
            </div>
            <span className="text-skull-text-dim">|</span>
            <span className="text-skull-text-dim">{tokens.length} tokens in memory</span>
            <span className="text-skull-text-dim">|</span>
            <span className="text-skull-text">{stats.tokensScanned} scanned</span>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-4 text-center text-[10px] text-skull-text-dim">
          <span>SKULL AGENT v3.0</span>
          <span className="mx-2">|</span>
          <span>darkweb edition</span>
          <span className="mx-2">|</span>
          <span className="text-skull-blood">hunt or be hunted</span>
        </div>
      </div>
    </div>
  )
}
