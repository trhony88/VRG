'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/vrg-api'

interface LogEntry {
  id: number; action: string; target: string; old_value: string
  new_value: string; admin_name: string; created_at: string
}

const ACTION_ICONS: Record<string, { icon: string; color: string }> = {
  create: { icon: '+', color: '#34d399' },
  update: { icon: '✎', color: '#60a5fa' },
  delete: { icon: '✕', color: '#ef4444' },
  status: { icon: '→', color: '#fbbf24' },
  login: { icon: '◉', color: '#a78bfa' },
}

const ACTION_FILTERS = [
  { label: 'Tous', value: '' },
  { label: 'Création', value: 'create' },
  { label: 'Modification', value: 'update' },
  { label: 'Suppression', value: 'delete' },
  { label: 'Statut', value: 'status' },
  { label: 'Connexion', value: 'login' },
]

const PAGE_SIZE = 20

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    api.get<LogEntry[]>('/admin/logs').then(data => {
      if (!cancelled) setLogs(data || [])
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = logs.filter(l => {
    const matchFilter = !filter || l.action === filter
    const matchSearch = !search ||
      l.target.toLowerCase().includes(search.toLowerCase()) ||
      l.admin_name.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const cellStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: 12, color: '#f0f0f5',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {ACTION_FILTERS.map(f => {
            const active = filter === f.value
            return (
              <button key={f.value} onClick={() => { setFilter(f.value); setPage(1) }}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none',
                  background: active ? 'rgba(255,153,0,0.12)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#FF9900' : 'rgba(240,240,245,0.5)',
                  fontSize: 11, fontWeight: active ? 600 : 400, cursor: 'pointer',
                }}>
                {f.label}
              </button>
            )
          })}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} color="rgba(240,240,245,0.35)"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher..."
            style={{
              width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#f0f0f5', fontSize: 12, outline: 'none',
            }} />
        </div>
      </div>

      {/* Count */}
      <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.35)' }}>
        {filtered.length} entrée{filtered.length > 1 ? 's' : ''}
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>Chargement...</div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>Aucune entrée</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Action', 'Cible', 'Ancien → Nouveau', 'Admin', 'Date'].map(h => (
                  <th key={h} style={{ fontSize: 10, fontWeight: 600, color: 'rgba(240,240,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(log => {
                const ai = ACTION_ICONS[log.action] || ACTION_ICONS.update
                return (
                  <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                    <td style={cellStyle}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: 6, background: `${ai.color}15`,
                        color: ai.color, fontSize: 12, fontWeight: 700, marginRight: 6,
                      }}>
                        {ai.icon}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(240,240,245,0.5)' }}>{log.action}</span>
                    </td>
                    <td style={{ ...cellStyle, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.target || '—'}</td>
                    <td style={{ ...cellStyle, fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.old_value && log.new_value ? (
                        <span>
                          <span style={{ color: '#f87171' }}>{log.old_value}</span>
                          <span style={{ margin: '0 4px', color: 'rgba(240,240,245,0.3)' }}>→</span>
                          <span style={{ color: '#34d399' }}>{log.new_value}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(240,240,245,0.35)' }}>{log.new_value || log.old_value || '—'}</span>
                      )}
                    </td>
                    <td style={{ ...cellStyle, color: 'rgba(240,240,245,0.6)' }}>{log.admin_name}</td>
                    <td style={{ ...cellStyle, color: 'rgba(240,240,245,0.35)', fontSize: 11 }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString('fr-FR') : '—'}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#f0f0f5', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.3 : 1, display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 12, color: 'rgba(240,240,245,0.5)' }}>
            Page {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#f0f0f5', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.3 : 1, display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
