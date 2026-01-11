import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY
);

// ═══════════════════════════════════════════════════════════════
// SYSTEM STATUS
// ═══════════════════════════════════════════════════════════════

export async function updateSystemStatus(data) {
    const { error } = await supabase
        .from('system_status')
        .upsert({ id: 1, ...data, updated_at: new Date().toISOString() });

    if (error) console.error('[SKULL] Status error:', error.message);
    return !error;
}

export async function getSystemStatus() {
    const { data } = await supabase
        .from('system_status')
        .select('*')
        .eq('id', 1)
        .single();
    return data;
}

// ═══════════════════════════════════════════════════════════════
// TOKENS (KILLS)
// ═══════════════════════════════════════════════════════════════

export async function upsertToken(token) {
    const { data, error } = await supabase
        .from('tokens')
        .upsert({ ...token, atualizado_em: new Date().toISOString() }, { onConflict: 'ca' })
        .select()
        .single();

    if (error) console.error('[SKULL] Token error:', error.message);
    return data;
}

export async function getToken(ca) {
    const { data } = await supabase
        .from('tokens')
        .select('*')
        .eq('ca', ca)
        .single();
    return data;
}

export async function updateToken(ca, updates) {
    const { data, error } = await supabase
        .from('tokens')
        .update({ ...updates, atualizado_em: new Date().toISOString() })
        .eq('ca', ca)
        .select()
        .single();

    if (error) console.error('[SKULL] Update error:', error.message);
    return data;
}

export async function getRecentTokens(limit = 50) {
    const { data } = await supabase
        .from('tokens')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(limit);
    return data || [];
}

// ═══════════════════════════════════════════════════════════════
// TRADES (KILLS)
// ═══════════════════════════════════════════════════════════════

export async function recordTrade(trade) {
    const { data, error } = await supabase
        .from('trades')
        .insert(trade)
        .select()
        .single();

    if (error) console.error('[SKULL] Trade error:', error.message);
    return data;
}

export async function getRecentTrades(limit = 20) {
    const { data } = await supabase
        .from('trades')
        .select('*, tokens(*)')
        .order('data', { ascending: false })
        .limit(limit);
    return data || [];
}

// ═══════════════════════════════════════════════════════════════
// POSITIONS (ACTIVE HUNTS)
// ═══════════════════════════════════════════════════════════════

export async function createPosition(position) {
    const { data, error } = await supabase
        .from('positions')
        .insert(position)
        .select()
        .single();

    if (error) console.error('[SKULL] Position error:', error.message);
    return data;
}

export async function getOpenPositions() {
    const { data } = await supabase
        .from('positions')
        .select('*, tokens(*)')
        .eq('status', 'open');
    return data || [];
}

export async function closePosition(id, pnl) {
    const { data, error } = await supabase
        .from('positions')
        .update({
            status: 'closed',
            pnl_sol: pnl,
            fechado_em: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) console.error('[SKULL] Close position error:', error.message);
    return data;
}

// ═══════════════════════════════════════════════════════════════
// SNIPER LOGS
// ═══════════════════════════════════════════════════════════════

export async function logSniperAction(action) {
    const { error } = await supabase
        .from('sniper_logs')
        .insert({
            ...action,
            timestamp: new Date().toISOString()
        });

    if (error) console.error('[SKULL] Log error:', error.message);
}

export async function getSniperLogs(limit = 100) {
    const { data } = await supabase
        .from('sniper_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
    return data || [];
}
