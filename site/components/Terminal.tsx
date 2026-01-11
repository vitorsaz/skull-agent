'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  SystemStatus,
  Token,
  SniperLog,
  subscribeToStatus,
  subscribeToTokens,
  subscribeToLogs,
  getSystemStatus,
  getRecentTokens,
  getSniperLogs
} from '@/lib/supabase'
import TokenDetails from './TokenDetails'

const SKULL_LOGO_URL = 'https://media.discordapp.net/attachments/1454587961642582039/1459763303877312733/fdf384eb-e0ae-47a5-bfe2-1791f62166ab.png?ex=69647604&is=69632484&hm=c6bd67af74990c793e69d7b720c26ef6410b2b089929fdb546a768368a7858b9&=&format=webp&quality=lossless&width=1008&height=1008'

export default function Terminal() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [tokens, setTokens] = useState<Token[]>([])
  const [logs, setLogs] = useState<SniperLog[]>([])
  const [activeTab, setActiveTab] = useState<'feed' | 'tokens' | 'ca' | 'logs'>('feed')
  const [commandInput, setCommandInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [selectedCA, setSelectedCA] = useState<string | null>(null)
  const [caInput, setCaInput] = useState('')
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getSystemStatus().then(setStatus)
    getRecentTokens(50).then(setTokens)
    getSniperLogs(100).then(setLogs)

    const statusSub = subscribeToStatus(setStatus)
    const tokensSub = subscribeToTokens((token) => {
      setTokens(prev => {
        const exists = prev.find(t => t.ca === token.ca)
        if (exists) {
          return prev.map(t => t.ca === token.ca ? token : t)
        }
        return [token, ...prev.slice(0, 49)]
      })
    })
    const logsSub = subscribeToLogs((log) => {
      setLogs(prev => [log, ...prev.slice(0, 99)])
    })

    return () => {
      statusSub.unsubscribe()
      tokensSub.unsubscribe()
      logsSub.unsubscribe()
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
  status    - system status
  tokens    - recent targets
  logs      - activity logs
  clear     - clear terminal
  about     - about skull agent
`
        break
      case 'status':
        response = status ? `
[SYSTEM STATUS]
  Status: ${status.status}
  Wallet: ${status.wallet_address ? status.wallet_address.slice(0, 8) + '...' : 'disconnected'}
  Balance: ${status.balance_sol?.toFixed(4) || 0} SOL
  Sniper: ${status.sniper_enabled ? 'ARMED' : 'SAFE'}
  Scanned: ${status.tokens_scanned || 0}
  Executed: ${status.snipes_executed || 0}
  K/D: ${status.kills || 0}/${status.deaths || 0}
` : '[ERROR] status unavailable'
        break
      case 'about':
        response = `
[SKULL AGENT v2.0]
  autonomous sniper for pump.fun
  darkweb edition

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

  const formatTime = (timestamp: string) => {
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

  const getActionColor = (action: string) => {
    switch (action) {
      case 'DETECTED': return 'text-skull-text'
      case 'APPROVED': return 'text-skull-text-bright'
      case 'REJECTED': return 'text-skull-text-dim'
      case 'SNIPING': return 'text-skull-blood'
      case 'SNIPE_SUCCESS': return 'text-skull-blood-bright blood-glow-subtle'
      case 'SNIPE_FAILED': return 'text-red-900'
      case 'TAKE_PROFIT': return 'text-skull-text-bright'
      case 'STOP_LOSS': return 'text-red-800'
      default: return 'text-skull-text'
    }
  }

  const getStatusColor = (tokenStatus: string) => {
    switch (tokenStatus?.toLowerCase()) {
      case 'excellent':
      case 'good':
      case 'approved':
      case 'sniped': return 'text-skull-text-bright border-skull-text-dim'
      case 'scanning': return 'text-skull-text border-skull-border'
      case 'risky':
      case 'avoid':
      case 'rejected': return 'text-skull-blood border-skull-blood'
      default: return 'text-skull-text-dim border-skull-border'
    }
  }

  const getScoreIndicator = (score: number) => {
    if (score >= 80) return { color: 'bg-skull-text-bright', label: 'A' }
    if (score >= 65) return { color: 'bg-skull-text', label: 'B' }
    if (score >= 50) return { color: 'bg-skull-blood', label: 'C' }
    return { color: 'bg-red-900', label: 'D' }
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
                  AUTONOMOUS SNIPER
                </p>
                <p className="text-skull-text-dim text-xs mt-2">
                  pump.fun darkweb terminal
                </p>
              </div>
            </div>

            {/* Status bar */}
            <div className="flex flex-wrap justify-center gap-6 text-xs border-t border-skull-border pt-4">
              <div className="flex items-center gap-2">
                <span className="text-skull-text-dim">STATUS</span>
                <span className={status?.status === 'HUNTING' ? 'text-skull-blood' : 'text-skull-text-dim'}>
                  {status?.status || 'OFFLINE'}
                </span>
                <motion.span
                  className="text-skull-blood text-[8px]"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {status?.status === 'HUNTING' ? '●' : '○'}
                </motion.span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-skull-text-dim">BAL</span>
                <span className="text-skull-text">{status?.balance_sol?.toFixed(4) || '0.0000'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-skull-text-dim">SNIPER</span>
                <span className={status?.sniper_enabled ? 'text-skull-blood' : 'text-skull-text-dim'}>
                  {status?.sniper_enabled ? 'ARMED' : 'SAFE'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-skull-text-dim">SCAN</span>
                <span className="text-skull-text">{status?.tokens_scanned || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-skull-text-dim">K/D</span>
                <span className="text-skull-text">{status?.kills || 0}/{status?.deaths || 0}</span>
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
                {['feed', 'tokens', 'ca', 'logs'].map((tab) => (
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
                  {logs.slice(0, 50).map((log, i) => (
                    <motion.div
                      key={log.id || i}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-2 hover:bg-skull-border/20 px-1 py-0.5 rounded cursor-pointer"
                      onClick={() => log.ca && setSelectedCA(log.ca)}
                    >
                      <span className="text-skull-text-dim">{formatTime(log.timestamp)}</span>
                      <span className={getActionColor(log.action)}>{log.action}</span>
                      <span className="text-skull-text">{log.symbol || '???'}</span>
                      {log.mcap && <span className="text-skull-text-dim">{formatMcap(log.mcap)}</span>}
                      {log.score && (
                        <span className={log.score >= 65 ? 'text-skull-text-bright' : 'text-skull-blood'}>
                          [{log.score}]
                        </span>
                      )}
                      {log.pnl_percent !== null && log.pnl_percent !== undefined && (
                        <span className={log.pnl_percent >= 0 ? 'text-skull-text-bright' : 'text-skull-blood'}>
                          {log.pnl_percent >= 0 ? '+' : ''}{log.pnl_percent.toFixed(1)}%
                        </span>
                      )}
                    </motion.div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}

              {/* TOKENS */}
              {activeTab === 'tokens' && (
                <div className="space-y-2">
                  {tokens.map((token, i) => {
                    const scoreInfo = getScoreIndicator(token.score || 0)
                    return (
                      <motion.div
                        key={token.id || i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="token-card p-3 rounded cursor-pointer"
                        onClick={() => setSelectedCA(token.ca)}
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
                                <span className="text-skull-text-bright font-medium">{token.simbolo}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 border rounded ${getStatusColor(token.status)}`}>
                                  {token.status?.toUpperCase()}
                                </span>
                              </div>
                              <span className="text-skull-text-dim text-xs">{token.nome?.slice(0, 20)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-skull-text">{formatMcap(token.market_cap || 0)}</div>
                            {token.score > 0 && (
                              <div className="flex items-center gap-1 justify-end mt-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${scoreInfo.color}`} />
                                <span className="text-skull-text-dim text-[10px]">{token.score}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-skull-text-dim text-[10px] mt-2 font-mono truncate">
                          {token.ca}
                        </div>
                      </motion.div>
                    )
                  })}
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
                    <h4 className="text-skull-text-dim text-xs mb-2">RECENT</h4>
                    <div className="space-y-1">
                      {tokens.slice(0, 5).map((token, i) => (
                        <div
                          key={i}
                          onClick={() => setSelectedCA(token.ca)}
                          className="flex items-center justify-between p-2 border border-skull-border rounded hover:border-skull-blood/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${getScoreIndicator(token.score || 0).color}`} />
                            <span className="text-skull-text text-xs">{token.simbolo}</span>
                            <span className="text-skull-text-dim text-[10px]">{token.ca?.slice(0, 6)}...{token.ca?.slice(-4)}</span>
                          </div>
                          <span className="text-skull-text-dim text-xs">{formatMcap(token.market_cap || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* LOGS */}
              {activeTab === 'logs' && (
                <div className="space-y-0.5">
                  {logs.map((log, i) => (
                    <div
                      key={log.id || i}
                      className="text-skull-text-dim hover:bg-skull-border/20 px-1 py-0.5 rounded cursor-pointer text-[11px]"
                      onClick={() => log.ca && setSelectedCA(log.ca)}
                    >
                      <span className="text-skull-text-dim">{formatTime(log.timestamp)}</span>
                      {' '}<span className={getActionColor(log.action)}>{log.action}</span>
                      {' '}<span className="text-skull-text">{log.ca?.slice(0, 6)}...</span>
                      {log.tx_signature && (
                        <a
                          href={`https://solscan.io/tx/${log.tx_signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-skull-blood ml-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          [TX]
                        </a>
                      )}
                    </div>
                  ))}
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

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 terminal rounded-lg p-4"
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center text-xs">
            <div>
              <div className="text-skull-text-dim text-[10px]">SCANNED</div>
              <div className="text-skull-text text-lg">{status?.tokens_scanned || 0}</div>
            </div>
            <div>
              <div className="text-skull-text-dim text-[10px]">EXECUTED</div>
              <div className="text-skull-blood text-lg">{status?.snipes_executed || 0}</div>
            </div>
            <div>
              <div className="text-skull-text-dim text-[10px]">KILL RATE</div>
              <div className="text-skull-text-bright text-lg">
                {status?.kills && status?.snipes_executed
                  ? ((status.kills / status.snipes_executed) * 100).toFixed(0)
                  : 0}%
              </div>
            </div>
            <div>
              <div className="text-skull-text-dim text-[10px]">PNL</div>
              <div className={`text-lg ${(status?.total_pnl || 0) >= 0 ? 'text-skull-text-bright' : 'text-skull-blood'}`}>
                {(status?.total_pnl || 0) >= 0 ? '+' : ''}{(status?.total_pnl || 0).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-skull-text-dim text-[10px]">LAST UPDATE</div>
              <div className="text-skull-text text-lg">
                {status?.updated_at
                  ? Math.floor((Date.now() - new Date(status.updated_at).getTime()) / 60000) + 'm'
                  : '--'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-4 text-center text-[10px] text-skull-text-dim">
          <span>SKULL AGENT v2.0</span>
          <span className="mx-2">|</span>
          <span>darkweb edition</span>
          <span className="mx-2">|</span>
          <span className="text-skull-blood">hunt or be hunted</span>
        </div>
      </div>
    </div>
  )
}
