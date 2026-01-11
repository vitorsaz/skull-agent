import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface SystemStatus {
  id: number
  status: string
  wallet_address: string | null
  balance_sol: number
  total_pnl: number
  total_trades: number
  win_rate: number
  tokens_scanned: number
  snipes_executed: number
  kills: number
  deaths: number
  sniper_enabled: boolean
  updated_at: string
}

export interface Token {
  id: string
  ca: string
  nome: string
  simbolo: string
  logo: string | null
  market_cap: number
  preco: number
  holders: number
  liquidity: number
  status: string
  score: number
  reject_reason: string | null
  criado_em: string
  atualizado_em: string
}

export interface SniperLog {
  id: string
  action: string
  ca: string
  name: string
  symbol: string
  reason: string | null
  score: number | null
  mcap: number | null
  liquidity: number | null
  pnl_percent: number | null
  tx_signature: string | null
  timestamp: string
}

export interface Position {
  id: string
  token_id: string
  status: string
  valor_sol: number
  entry_price: number
  current_price: number
  pnl_percent: number
  pnl_sol: number
  aberto_em: string
  fechado_em: string | null
  tokens?: Token
}

// Realtime subscriptions
export function subscribeToStatus(callback: (status: SystemStatus) => void) {
  return supabase
    .channel('system_status_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'system_status' },
      (payload) => callback(payload.new as SystemStatus)
    )
    .subscribe()
}

export function subscribeToTokens(callback: (token: Token) => void) {
  return supabase
    .channel('tokens_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tokens' },
      (payload) => callback(payload.new as Token)
    )
    .subscribe()
}

export function subscribeToLogs(callback: (log: SniperLog) => void) {
  return supabase
    .channel('sniper_logs_changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'sniper_logs' },
      (payload) => callback(payload.new as SniperLog)
    )
    .subscribe()
}

// Fetchers
export async function getSystemStatus(): Promise<SystemStatus | null> {
  const { data } = await supabase
    .from('system_status')
    .select('*')
    .eq('id', 1)
    .single()
  return data
}

export async function getRecentTokens(limit = 50): Promise<Token[]> {
  const { data } = await supabase
    .from('tokens')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(limit)
  return data || []
}

export async function getSniperLogs(limit = 100): Promise<SniperLog[]> {
  const { data } = await supabase
    .from('sniper_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit)
  return data || []
}

export async function getOpenPositions(): Promise<Position[]> {
  const { data } = await supabase
    .from('positions')
    .select('*, tokens(*)')
    .eq('status', 'open')
  return data || []
}
