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
  const [activeTab, setActiveTab] = useState<'feed' | 'tokens' | 'logs'>('feed')
  const [commandInput, setCommandInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initial fetch
    getSystemStatus().then(setStatus)
    getRecentTokens(30).then(setTokens)
    getSniperLogs(50).then(setLogs)

    // Realtime subscriptions
    const statusSub = subscribeToStatus(setStatus)
    const tokensSub = subscribeToTokens((token) => {
      setTokens(prev => [token, ...prev.slice(0, 49)])
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
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

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
SKULL AGENT v1.0.0
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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatMcap = (value: number) => {
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

  const getStatusIcon = (tokenStatus: string) => {
    switch (tokenStatus) {
      case 'approved': return '✓'
      case 'rejected': return '✗'
      case 'scanning': return '◌'
      case 'sniped': return '◉'
      default: return '○'
    }
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
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('feed')}
                  className={`px-3 py-1 text-xs rounded ${activeTab === 'feed' ? 'bg-skull-green/20 text-skull-green' : 'text-gray-500'}`}
                >
                  LIVE FEED
                </button>
                <button
                  onClick={() => setActiveTab('tokens')}
                  className={`px-3 py-1 text-xs rounded ${activeTab === 'tokens' ? 'bg-skull-green/20 text-skull-green' : 'text-gray-500'}`}
                >
                  TOKENS
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-3 py-1 text-xs rounded ${activeTab === 'logs' ? 'bg-skull-green/20 text-skull-green' : 'text-gray-500'}`}
                >
                  LOGS
                </button>
              </div>
              <span className="text-skull-green text-xs">
                {tokens.length} targets
              </span>
            </div>

            <div className="h-96 overflow-y-auto p-4 font-mono text-xs md:text-sm">
              {activeTab === 'feed' && (
                <div className="space-y-1">
                  {logs.slice(0, 30).map((log, i) => (
                    <motion.div
                      key={log.id || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-2"
                    >
                      <span className="text-gray-600">[{formatTime(log.timestamp)}]</span>
                      <span className={getActionColor(log.action)}>[{log.action}]</span>
                      <span className="text-skull-green">{log.symbol || '???'}</span>
                      {log.mcap && <span className="text-gray-500">MC:{formatMcap(log.mcap)}</span>}
                      {log.score && <span className="text-yellow-500">Score:{log.score}</span>}
                      {log.reason && log.reason !== 'APPROVED' && (
                        <span className="text-skull-blood">{log.reason}</span>
                      )}
                      {log.pnl_percent && (
                        <span className={log.pnl_percent >= 0 ? 'text-green-400' : 'text-skull-blood'}>
                          {log.pnl_percent >= 0 ? '+' : ''}{log.pnl_percent.toFixed(2)}%
                        </span>
                      )}
                    </motion.div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}

              {activeTab === 'tokens' && (
                <div className="space-y-2">
                  {tokens.map((token, i) => (
                    <motion.div
                      key={token.id || i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="token-card p-3 rounded"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={token.status === 'approved' ? 'text-skull-green' : 'text-gray-500'}>
                            {getStatusIcon(token.status)}
                          </span>
                          <span className="text-skull-green ml-2">{token.simbolo}</span>
                          <span className="text-gray-500 ml-2 text-xs">{token.nome?.slice(0, 20)}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-skull-green">{formatMcap(token.market_cap || 0)}</div>
                          {token.score > 0 && (
                            <div className="text-yellow-500 text-xs">Score: {token.score}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-gray-600 text-xs mt-1 truncate">
                        {token.ca}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="space-y-1">
                  {logs.map((log, i) => (
                    <div key={log.id || i} className="text-gray-400">
                      <span className="text-gray-600">{formatTime(log.timestamp)}</span>
                      {' '}<span className={getActionColor(log.action)}>{log.action}</span>
                      {' '}<span className="text-skull-green">{log.ca?.slice(0, 8)}...</span>
                      {log.tx_signature && (
                        <span className="text-blue-400 ml-2">TX:{log.tx_signature.slice(0, 8)}...</span>
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
                    autoFocus
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
          <span>SKULL AGENT v1.0.0</span>
          <span className="mx-2">|</span>
          <span>Hunt or be hunted</span>
          <span className="mx-2">|</span>
          <span className="text-skull-blood">&#9760;</span>
        </div>
      </div>
    </div>
  )
}
