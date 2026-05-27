'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown, ChevronUp, CreditCard, Phone, MapPin, Clock, Trash2 } from 'lucide-react'
import { api } from '@/lib/vrg-api'
import AdminDropdown from '../AdminDropdown'

interface OrderItem {
  name: string; qty: number; price: number
}

interface Order {
  id: number; items: OrderItem[]; total: number; status: string
  date: string; payment: string; address: string; zone?: string
  hours?: string; delivery_fee?: number; client_name?: string; client_phone?: string
  paid_confirmed?: boolean
}

const STATUS_TABS = [
  { label: 'Tous', value: '' },
  { label: 'En attente', value: 'pending', color: '#fbbf24' },
  { label: 'Confirmé', value: 'confirmed', color: '#34d399' },
  { label: 'En livraison', value: 'shipping', color: '#60a5fa' },
  { label: 'Livré', value: 'delivered', color: '#a78bfa' },
  { label: 'Annulé', value: 'cancelled', color: '#f87171' },
]

const STATUS_OPTIONS = STATUS_TABS.filter(t => t.value).map(t => ({
  label: t.label, value: t.value, color: t.color,
}))

function statusBadge(status: string) {
  const s = STATUS_TABS.find(t => t.value === status)
  const color = s?.color || 'rgba(240,240,245,0.3)'
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      color, background: `${color}18`, border: `1px solid ${color}30`,
    }}>
      {s?.label || status}
    </span>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const loadOrders = async () => {
    setLoading(true)
    try {
      const data = await api.get<Order[]>('/admin/orders')
      setOrders(data || [])
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.id.toString().includes(search) ||
      (o.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.client_phone || '').includes(search)
    const matchTab = !tab || o.status === tab
    return matchSearch && matchTab
  })

  const cancelledCount = orders.filter(o => o.status === 'cancelled').length

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await api.put(`/admin/orders/${id}`, { status })
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
      window.dispatchEvent(new CustomEvent('admin-data-refresh'))
    } catch {}
  }

  const handlePaidToggle = async (id: number, paid: boolean) => {
    try {
      await api.put(`/admin/orders/${id}`, { paid_confirmed: paid })
      setOrders(prev => prev.map(o => o.id === id ? { ...o, paid_confirmed: paid } : o))
      window.dispatchEvent(new CustomEvent('admin-data-refresh'))
    } catch {}
  }

  const handleDeleteCancelled = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      setTimeout(() => setDeleteConfirm(false), 4000)
      return
    }
    setDeleting(true)
    setDeleteConfirm(false)
    try {
      const res = await api.del<{ deleted: number }>('/admin/orders')
      if (res.deleted > 0) {
        setOrders(prev => prev.filter(o => o.status !== 'cancelled'))
        if (tab === 'cancelled') setTab('')
        window.dispatchEvent(new CustomEvent('admin-data-refresh'))
      }
    } catch {} finally {
      setDeleting(false)
    }
  }

  const handleDeleteSingle = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Supprimer cette commande ?')) return
    try {
      await api.del(`/admin/orders/${id}`)
      setOrders(prev => prev.filter(o => o.id !== id))
      if (expanded === id) setExpanded(null)
      window.dispatchEvent(new CustomEvent('admin-data-refresh'))
    } catch {}
  }

  const cardBase: React.CSSProperties = {
    background: 'rgba(255,255,255,0.02)', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Search + Delete cancelled button */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} color="rgba(240,240,245,0.35)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par #ID, nom, téléphone..."
            style={{
              width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#f0f0f5', fontSize: 13, outline: 'none',
            }} />
        </div>
        {cancelledCount > 0 && (
          <button
            onClick={handleDeleteCancelled}
            disabled={deleting}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 8,
              border: 'none', cursor: deleting ? 'wait' : 'pointer',
              fontSize: 12, fontWeight: 600,
              background: deleteConfirm
                ? 'rgba(239,68,68,0.2)'
                : 'rgba(239,68,68,0.08)',
              color: deleteConfirm ? '#fca5a5' : 'rgba(248,113,113,0.8)',
              borderStyle: 'solid',
              borderColor: deleteConfirm ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.15)',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              if (!deleting && !deleteConfirm) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'
                (e.currentTarget as HTMLButtonElement).style.color = '#f87171'
              }
            }}
            onMouseLeave={e => {
              if (!deleting && !deleteConfirm) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(248,113,113,0.8)'
              }
            }}
          >
            <Trash2 size={14} />
            {deleteConfirm
              ? `Confirmer la suppression (${cancelledCount})`
              : deleting
                ? 'Suppression...'
                : `Effacer annulées (${cancelledCount})`}
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {STATUS_TABS.map(t => {
          const count = t.value ? orders.filter(o => o.status === t.value).length : orders.length
          const active = tab === t.value
          return (
            <button key={t.value} onClick={() => setTab(t.value)}
              style={{
                padding: '6px 14px', borderRadius: 8,
                background: active ? (t.color || '#FF9900') + '18' : 'rgba(255,255,255,0.04)',
                color: active ? (t.color || '#FF9900') : 'rgba(240,240,245,0.5)',
                fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer',
                border: active ? `1px solid ${(t.color || '#FF9900')}30` : '1px solid transparent',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              {t.label}
              <span style={{ fontSize: 10, opacity: 0.7 }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Orders list */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>Aucune commande</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(order => (
            <motion.div key={order.id} layout style={cardBase}>
              {/* Order header */}
              <div style={{ padding: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5' }}>#{order.id}</span>
                  {statusBadge(order.status)}
                  {!order.paid_confirmed && (
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                      Non payé
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'rgba(240,240,245,0.5)' }}>
                  <span>{order.client_name || 'Client'}</span>
                  <span style={{ fontWeight: 600, color: '#f0f0f5', fontSize: 14 }}>
                    {order.total.toLocaleString('fr-FR')} Ar
                  </span>
                  {/* Delete single order button */}
                  <button
                    onClick={(e) => handleDeleteSingle(order.id, e)}
                    title="Supprimer cette commande"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(248,113,113,0.5)', padding: 4,
                      borderRadius: 4, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#f87171'
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'rgba(248,113,113,0.5)'
                      (e.currentTarget as HTMLButtonElement).style.background = 'none'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                  {expanded === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {expanded === order.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                      {/* Client info */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 14, fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(240,240,245,0.6)' }}>
                          <Phone size={13} /> {order.client_phone || '—'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(240,240,245,0.6)' }}>
                          <MapPin size={13} /> {order.zone || '—'} · {order.address || '—'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(240,240,245,0.6)' }}>
                          <Clock size={13} /> {order.hours || '—'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(240,240,245,0.6)' }}>
                          <CreditCard size={13} /> {order.payment || '—'} {order.delivery_fee ? `+ ${(order.delivery_fee).toLocaleString('fr-FR')} Ar` : ''}
                        </div>
                        <span style={{ color: 'rgba(240,240,245,0.35)', fontSize: 11 }}>
                          {new Date(order.date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>

                      {/* Items */}
                      <div style={{ marginBottom: 14 }}>
                        {order.items.map((item, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                            <span style={{ color: 'rgba(240,240,245,0.6)' }}>
                              {item.name} × {item.qty}
                            </span>
                            <span style={{ color: '#f0f0f5' }}>
                              {(item.price * item.qty).toLocaleString('fr-FR')} Ar
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: 'rgba(240,240,245,0.4)' }}>Statut:</span>
                          <AdminDropdown
                            compact
                            options={STATUS_OPTIONS}
                            value={order.status}
                            onChange={val => handleStatusChange(order.id, val)}
                            width={150}
                          />
                        </div>
                        <label style={{
                          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                          padding: '6px 12px', borderRadius: 8,
                          background: order.paid_confirmed ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${order.paid_confirmed ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)'}`,
                          fontSize: 12, color: order.paid_confirmed ? '#34d399' : 'rgba(240,240,245,0.5)',
                        }}>
                          <input type="checkbox" checked={!!order.paid_confirmed}
                            onChange={e => handlePaidToggle(order.id, e.target.checked)}
                            style={{ display: 'none' }} />
                          <CreditCard size={14} />
                          {order.paid_confirmed ? 'Payé confirmé' : 'Confirmer paiement'}
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
