'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Package, CheckCircle2, Archive, Trash2, Save, Search } from 'lucide-react'
import { api } from '@/lib/vrg-api'
import { getCatColor } from '@/lib/vrg-cat-colors'

interface StockItem {
  id: number; name: string; category: string; stock: number
  price: number; image: string; archived: boolean
}

export default function Stocks() {
  const [items, setItems] = useState<StockItem[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [editVal, setEditVal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.get<StockItem[]>('/admin/stocks').then(data => {
      if (!cancelled) setItems(data || [])
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const active = items.filter(i => !i.archived)
  const archived = items.filter(i => i.archived)
  const critical = active.filter(i => i.stock === 0).length
  const low = active.filter(i => i.stock > 0 && i.stock <= 5).length
  const ok = active.filter(i => i.stock > 5).length

  const filtered = active
    .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.stock - b.stock)

  const handleStockSave = async (id: number) => {
    try {
      await api.put(`/admin/products/${id}`, { stock: editVal })
      setItems(prev => prev.map(i => i.id === id ? { ...i, stock: editVal } : i))
      setEditing(null)
    } catch {}
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer définitivement cet article ?')) return
    try {
      await api.del(`/admin/products/${id}`)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch {}
  }

  const summaryCards = [
    { label: 'Rupture', value: critical, color: '#ef4444', icon: <AlertTriangle size={18} /> },
    { label: 'Stock bas', value: low, color: '#fbbf24', icon: <Package size={18} /> },
    { label: 'OK', value: ok, color: '#34d399', icon: <CheckCircle2 size={18} /> },
    { label: 'Archivés', value: archived.length, color: 'rgba(240,240,245,0.3)', icon: <Archive size={18} /> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        {summaryCards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              padding: 16, borderRadius: 12,
              background: `${c.color}08`, border: `1px solid ${c.color}20`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${c.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color }}>
              {c.icon}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.4)' }}>{c.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 320 }}>
        <Search size={15} color="rgba(240,240,245,0.35)"
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
          style={{
            width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#f0f0f5', fontSize: 13, outline: 'none',
          }} />
      </div>

      {/* Active stock list */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>Aucun article</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Article', 'Catégorie', 'Prix', 'Stock', 'Actions'].map(h => (
                  <th key={h} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(240,240,245,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const cc = getCatColor(item.category)
                const isEditing = editing === item.id
                return (
                  <tr key={item.id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#f0f0f5', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {item.image ? (
                          <img src={item.image} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
                        )}
                        {item.name}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: cc.color, background: cc.bg, border: `1px solid ${cc.border}` }}>
                        {item.category || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#f0f0f5', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {item.price.toLocaleString('fr-FR')} Ar
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input type="number" value={editVal} onChange={e => setEditVal(Number(e.target.value))}
                            style={{ width: 60, padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,153,0,0.3)', color: '#f0f0f5', fontSize: 13, outline: 'none' }} />
                          <button onClick={() => handleStockSave(item.id)} title="Sauvegarder"
                            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'rgba(52,211,153,0.15)', color: '#34d399', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Save size={13} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditing(item.id); setEditVal(item.stock) }}
                          style={{
                            padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            background: item.stock === 0 ? 'rgba(239,68,68,0.12)' : item.stock <= 5 ? 'rgba(251,191,36,0.12)' : 'rgba(52,211,153,0.08)',
                            color: item.stock === 0 ? '#ef4444' : item.stock <= 5 ? '#fbbf24' : '#34d399',
                          }}>
                          {item.stock}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleStockSave(item.id)} title="Modifier stock"
                          style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.05)', color: '#f0f0f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Package size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Archived items */}
      {archived.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(240,240,245,0.5)', marginBottom: 10 }}>Articles archivés ({archived.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {archived.map(item => (
              <div key={item.id} style={{
                padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.04)',
                border: '1px solid rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: 'rgba(240,240,245,0.5)' }}>{item.name}</span>
                  <span style={{ fontSize: 11, color: 'rgba(240,240,245,0.3)' }}>{item.category}</span>
                </div>
                <button onClick={() => handleDelete(item.id)} title="Supprimer définitivement"
                  style={{ width: 30, height: 30, borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
