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

const SKULL_HEADER = `
 ░██████╗██╗░░██╗██╗░░░██╗██╗░░░░░██╗░░░░░
 ██╔════╝██║░██╔╝██║░░░██║██║░░░░░██║░░░░░
 ╚█████╗░█████═╝░██║░░░██║██║░░░░░██║░░░░░
 ░╚═══██╗██╔═██╗░██║░░░██║██║░░░░░██║░░░░░
 ██████╔╝██║░╚██╗╚██████╔╝███████╗███████╗
 ╚═════╝░╚═╝░░╚═╝░╚═════╝░╚══════╝╚══════╝
          ▄︻̷̿┻̿═━一  AGENT
`

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
    // Initial fetch
    getSystemStatus().then(setStatus)
    getRecentTokens(50).then(setTokens)
    getSniperLogs(100).then(setLogs)

    // Realtime subscriptions
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
Available commands:
  status    - Show system status
  tokens    - Show recent tokens
  logs      - Show sniper logs
  clear     - Clear command history
  about     - About SKULL AGENT
`
        break
      case 'status':
        response = status ? `
System Status: ${status.status}
Wallet: ${status.wallet_address || 'Not connected'}
Balance: ${status.balance_sol?.toFixed(4) || 0} SOL
Sniper: ${status.sniper_enabled ? 'ENABLED' : 'DISABLED'}
Tokens Scanned: ${status.tokens_scanned || 0}
Snipes Executed: ${status.snipes_executed || 0}
Kills: ${status.kills || 0}
Deaths: ${status.deaths || 0}
` : 'Status unavailable'
        break
      case 'about':
        response = `
SKULL AGENT v2.0
Autonomous sniper for PumpFun tokens
Hunt or be hunted.
`
        break
      case 'clear':
        setCommandHistory([])
        setCommandInput('')
        return
      default:
        response = `Unknown command: ${cmd}. Type 'help' for available commands.`
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
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
    return `$${value.toFixed(2)}`
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'DETECTED': return 'text-yellow-500'
      case 'APPROVED': return 'text-skull-green'
      case 'REJECTED': return 'text-gray-500'
      case 'SNIPING': return 'text-orange-500'
      case 'SNIPE_SUCCESS': return 'text-skull-green skull-glow'
      case 'SNIPE_FAILED': return 'text-skull-blood'
      case 'TAKE_PROFIT': return 'text-green-400'
      case 'STOP_LOSS': return 'text-red-500'
      default: return 'text-skull-green'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'excellent': return 'text-green-400 border-green-400'
      case 'good': return 'text-yellow-400 border-yellow-400'
      case 'approved': return 'text-skull-green border-skull-green'
      case 'sniped': return 'text-purple-400 border-purple-400'
      case 'scanning': return 'text-blue-400 border-blue-400'
      case 'risky': return 'text-orange-400 border-orange-400'
      case 'avoid':
      case 'rejected': return 'text-skull-blood border-skull-blood'
      default: return 'text-gray-500 border-gray-500'
    }
  }

  const getScoreIndicator = (score: number) => {
    if (score >= 80) return { color: 'bg-green-500', label: 'EXCELLENT' }
    if (score >= 65) return { color: 'bg-yellow-500', label: 'GOOD' }
    if (score >= 50) return { color: 'bg-orange-500', label: 'RISKY' }
    return { color: 'bg-red-500', label: 'AVOID' }
  }

  return (
    <div className="min-h-screen bg-skull-black p-2 md:p-4">
      {/* Blood drips */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="blood-drip"
          style={{ left: `${5 + i * 10}%`, animationDelay: `${i * 0.3}s` }}
        />
      ))}

      {/* Token Details Modal */}
      {selectedCA && (
        <TokenDetails ca={selectedCA} onClose={() => setSelectedCA(null)} />
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="terminal rounded-lg overflow-hidden mb-4"
        >
          <div className="terminal-header p-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-skull-blood" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-skull-green" />
            </div>
            <span className="text-skull-green text-sm ml-2">skull-agent@pump.fun</span>
          </div>
          <div className="p-4">
            <pre className="text-skull-green text-xs md:text-sm skull-glow leading-tight">
              {SKULL_HEADER}
            </pre>

            {/* Status bar */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs md:text-sm border-t border-skull-green/30 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">STATUS:</span>
                <span className={status?.status === 'HUNTING' ? 'status-online' : 'status-offline'}>
                  {status?.status || 'OFFLINE'}
                </span>
                <motion.span
                  className={status?.status === 'HUNTING' ? 'text-skull-green' : 'text-skull-blood'}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ●
                </motion.span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">BALANCE:</span>
                <span className="text-skull-green">{status?.balance_sol?.toFixed(4) || '0.0000'} SOL</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">SNIPER:</span>
                <span className={status?.sniper_enabled ? 'text-skull-green' : 'text-skull-blood'}>
                  {status?.sniper_enabled ? 'ARMED' : 'SAFE'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">SCANNED:</span>
                <span className="text-skull-green">{status?.tokens_scanned || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">KILLS:</span>
                <span className="text-green-400">{status?.kills || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">DEATHS:</span>
                <span className="text-skull-blood">{status?.deaths || 0}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left panel - Live Feed */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 terminal rounded-lg overflow-hidden"
          >
            <div className="terminal-header p-2 flex items-center justify-between">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('feed')}
                  className={`px-3 py-1 text-xs rounded ${activeTab === 'feed' ? 'bg-skull-green/20 text-skull-green' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  LIVE FEED
                </button>
                <button
                  onClick={() => setActiveTab('tokens')}
                  className={`px-3 py-1 text-xs rounded ${activeTab === 'tokens' ? 'bg-skull-green/20 text-skull-green' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  TOKENS
                </button>
                <button
                  onClick={() => setActiveTab('ca')}
                  className={`px-3 py-1 text-xs rounded ${activeTab === 'ca' ? 'bg-skull-blood/20 text-skull-blood' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  CA LOOKUP
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-3 py-1 text-xs rounded ${activeTab === 'logs' ? 'bg-skull-green/20 text-skull-green' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  LOGS
                </button>
              </div>
              <span className="text-skull-green text-xs">
                {tokens.length} targets
              </span>
            </div>

            <div className="h-96 overflow-y-auto p-4 font-mono text-xs md:text-sm">
              {/* LIVE FEED TAB */}
              {activeTab === 'feed' && (
                <div className="space-y-1">
                  {logs.slice(0, 50).map((log, i) => (
                    <motion.div
                      key={log.id || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-2 hover:bg-skull-green/5 px-1 rounded cursor-pointer"
                      onClick={() => log.ca && setSelectedCA(log.ca)}
                    >
                      <span className="text-gray-600">[{formatTime(log.timestamp)}]</span>
                      <span className={getActionColor(log.action)}>[{log.action}]</span>
                      <span className="text-skull-green">{log.symbol || '???'}</span>
                      {log.mcap && <span className="text-gray-500">MC:{formatMcap(log.mcap)}</span>}
                      {log.score && (
                        <span className={`${log.score >= 65 ? 'text-green-400' : log.score >= 50 ? 'text-yellow-500' : 'text-skull-blood'}`}>
                          S:{log.score}
                        </span>
                      )}
                      {log.pnl_percent !== null && log.pnl_percent !== undefined && (
                        <span className={log.pnl_percent >= 0 ? 'text-green-400' : 'text-skull-blood'}>
                          {log.pnl_percent >= 0 ? '+' : ''}{log.pnl_percent.toFixed(2)}%
                        </span>
                      )}
                    </motion.div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}

              {/* TOKENS TAB */}
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
                          <div className="flex items-center gap-2">
                            {token.logo && (
                              <img src={token.logo} alt="" className="w-8 h-8 rounded" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-skull-green font-bold">{token.simbolo}</span>
                                <span className={`text-xs px-1 border rounded ${getStatusColor(token.status)}`}>
                                  {token.status?.toUpperCase()}
                                </span>
                              </div>
                              <span className="text-gray-500 text-xs">{token.nome?.slice(0, 25)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-skull-green">{formatMcap(token.market_cap || 0)}</div>
                            {token.score > 0 && (
                              <div className="flex items-center gap-1 justify-end">
                                <div className={`w-2 h-2 rounded-full ${scoreInfo.color}`} />
                                <span className="text-xs text-gray-500">{token.score}/100</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-gray-600 text-xs mt-2 truncate font-mono">
                          {token.ca}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Liq: {formatMcap(token.liquidity || 0)}</span>
                          <span>Holders: {token.holders || 0}</span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {/* CA LOOKUP TAB */}
              {activeTab === 'ca' && (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="text-2xl mb-2">🔍</div>
                    <h3 className="text-skull-green text-lg mb-2">CA Lookup</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      Enter a contract address to view token details
                    </p>
                  </div>

                  <form onSubmit={handleCASearch} className="flex gap-2">
                    <input
                      type="text"
                      value={caInput}
                      onChange={(e) => setCaInput(e.target.value)}
                      placeholder="Enter contract address..."
                      className="flex-1 bg-skull-dark border border-skull-green/30 rounded px-3 py-2 text-skull-green font-mono text-sm focus:outline-none focus:border-skull-green"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-skull-green/20 border border-skull-green text-skull-green rounded hover:bg-skull-green/30 transition-colors"
                    >
                      Search
                    </button>
                  </form>

                  <div className="border-t border-skull-green/20 pt-4">
                    <h4 className="text-gray-500 text-sm mb-2">Recent Lookups</h4>
                    <div className="space-y-2">
                      {tokens.slice(0, 5).map((token, i) => (
                        <div
                          key={i}
                          onClick={() => setSelectedCA(token.ca)}
                          className="flex items-center justify-between p-2 border border-skull-green/20 rounded hover:border-skull-green/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getScoreIndicator(token.score || 0).color}`} />
                            <span className="text-skull-green">{token.simbolo}</span>
                            <span className="text-gray-600 text-xs">{token.ca?.slice(0, 8)}...{token.ca?.slice(-6)}</span>
                          </div>
                          <span className="text-gray-500 text-xs">{formatMcap(token.market_cap || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* LOGS TAB */}
              {activeTab === 'logs' && (
                <div className="space-y-1">
                  {logs.map((log, i) => (
                    <div
                      key={log.id || i}
                      className="text-gray-400 hover:bg-skull-green/5 px-1 rounded cursor-pointer"
                      onClick={() => log.ca && setSelectedCA(log.ca)}
                    >
                      <span className="text-gray-600">{formatTime(log.timestamp)}</span>
                      {' '}<span className={getActionColor(log.action)}>{log.action}</span>
                      {' '}<span className="text-skull-green">{log.ca?.slice(0, 8)}...</span>
                      {log.tx_signature && (
                        <a
                          href={`https://solscan.io/tx/${log.tx_signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 ml-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          TX
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
              <span className="text-skull-green text-xs">COMMAND TERMINAL</span>
            </div>

            <div className="h-96 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
                <div className="text-skull-green mb-4">
                  Type 'help' for available commands
                </div>
                {commandHistory.map((line, i) => (
                  <div key={i} className="text-skull-green whitespace-pre-wrap">
                    {line}
                  </div>
                ))}
              </div>

              <form onSubmit={handleCommand} className="p-2 border-t border-skull-green/30">
                <div className="flex items-center gap-2">
                  <span className="text-skull-blood">{'>'}</span>
                  <input
                    type="text"
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    className="terminal-input flex-1 text-sm"
                    placeholder="Enter command..."
                  />
                  <motion.span
                    className="text-skull-green"
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center text-xs md:text-sm">
            <div>
              <div className="text-gray-500">TOKENS SCANNED</div>
              <div className="text-skull-green text-xl">{status?.tokens_scanned || 0}</div>
            </div>
            <div>
              <div className="text-gray-500">SNIPES EXECUTED</div>
              <div className="text-yellow-500 text-xl">{status?.snipes_executed || 0}</div>
            </div>
            <div>
              <div className="text-gray-500">KILL RATE</div>
              <div className="text-green-400 text-xl">
                {status?.kills && status?.snipes_executed
                  ? ((status.kills / status.snipes_executed) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
            <div>
              <div className="text-gray-500">TOTAL PNL</div>
              <div className={`text-xl ${(status?.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-skull-blood'}`}>
                {(status?.total_pnl || 0) >= 0 ? '+' : ''}{(status?.total_pnl || 0).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-gray-500">UPTIME</div>
              <div className="text-skull-green text-xl">
                {status?.updated_at
                  ? Math.floor((Date.now() - new Date(status.updated_at).getTime()) / 60000) + 'm ago'
                  : 'N/A'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-600">
          <span>SKULL AGENT v2.0</span>
          <span className="mx-2">|</span>
          <span>Hunt or be hunted</span>
          <span className="mx-2">|</span>
          <span className="text-skull-blood">&#9760;</span>
        </div>
      </div>
    </div>
  )
}
