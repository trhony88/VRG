'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown, ChevronUp, UserPlus, Shield, Users } from 'lucide-react'
import { api } from '@/lib/vrg-api'
import AdminDropdown from '../AdminDropdown'

interface UserInfo {
  id: number; name: string; phone: string; role: string
  orders_count: number; total_spent: number; referrals: number
  created_at?: string; address?: string
}

const ROLE_OPTIONS = [
  { label: 'Client', value: 'client', color: '#60a5fa' },
  { label: 'Modérateur', value: 'moderator', color: '#fbbf24' },
  { label: 'Admin', value: 'admin', color: '#ef4444' },
]

const TABS = ['clients', 'staff'] as const

export default function UsersPage() {
  const [tab, setTab] = useState<'clients' | 'staff'>('clients')
  const [users, setUsers] = useState<UserInfo[]>([])
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [adminRole, setAdminRole] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; edit?: UserInfo }>({ open: false })
  const [form, setForm] = useState({ name: '', phone: '', password: '', role: 'moderator' })

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const me = await api.get<{ user: { role: string } }>('/auth/me')
        if (!cancelled) setAdminRole(me.user.role === 'admin')
        const data = await api.get<UserInfo[]>('/admin/users')
        if (!cancelled) setUsers(data || [])
      } catch {}
      if (!cancelled) setLoading(false)
    }
    init()
    return () => { cancelled = true }
  }, [])

  const filtered = users
    .filter(u => tab === 'staff' ? u.role !== 'client' : u.role === 'client')
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search))

  const handleRoleChange = async (id: number, role: string) => {
    try {
      await api.put(`/admin/users/${id}`, { role })
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
    } catch {}
  }

  const handleCreateStaff = async () => {
    if (!form.name || !form.phone || !form.password) return
    try {
      await api.post('/admin/users', form)
      setModal({ open: false })
      setForm({ name: '', phone: '', password: '', role: 'moderator' })
      load()
    } catch {}
  }

  const cardBase: React.CSSProperties = {
    background: 'rgba(255,255,255,0.02)', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)',
  }

  const roleBadge = (role: string) => {
    const r = ROLE_OPTIONS.find(o => o.value === role)
    const c = r?.color || 'rgba(240,240,245,0.3)'
    return (
      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: c, background: `${c}18` }}>
        {r?.label || role}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3, border: '1px solid rgba(255,255,255,0.06)' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '6px 16px', borderRadius: 6, border: 'none',
                background: tab === t ? 'rgba(255,153,0,0.12)' : 'transparent',
                color: tab === t ? '#FF9900' : 'rgba(240,240,245,0.5)',
                fontSize: 12, fontWeight: tab === t ? 600 : 400, cursor: 'pointer',
              }}>
              {t === 'clients' ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> Clients</span>
                : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={14} /> Staff</span>}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={15} color="rgba(240,240,245,0.35)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            style={{
              width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#f0f0f5', fontSize: 13, outline: 'none',
            }} />
        </div>

        {adminRole && tab === 'staff' && (
          <motion.button onClick={() => setModal({ open: true, edit: undefined })}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: '#FF9900', color: '#fff', fontSize: 13,
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <UserPlus size={15} /> Ajouter
          </motion.button>
        )}
      </div>

      {/* Users list */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>Aucun utilisateur</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(user => (
            <motion.div key={user.id} layout style={cardBase}>
              <div style={{ padding: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === user.id ? null : user.id)}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'rgba(255,153,0,0.1)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#FF9900', flexShrink: 0,
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5' }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.4)' }}>{user.phone}</div>
                </div>
                {roleBadge(user.role)}
                <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.5)' }}>
                  {user.orders_count} cmd · {(user.total_spent || 0).toLocaleString('fr-FR')} Ar
                </div>
                {expanded === user.id ? <ChevronUp size={16} color="rgba(240,240,245,0.3)" /> : <ChevronDown size={16} color="rgba(240,240,245,0.3)" />}
              </div>

              <AnimatePresence>
                {expanded === user.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 12, fontSize: 12 }}>
                        <div>
                          <div style={{ color: 'rgba(240,240,245,0.35)', marginBottom: 2 }}>Commandes</div>
                          <div style={{ color: '#f0f0f5', fontWeight: 600 }}>{user.orders_count}</div>
                        </div>
                        <div>
                          <div style={{ color: 'rgba(240,240,245,0.35)', marginBottom: 2 }}>Total dépensé</div>
                          <div style={{ color: '#f0f0f5', fontWeight: 600 }}>{(user.total_spent || 0).toLocaleString('fr-FR')} Ar</div>
                        </div>
                        <div>
                          <div style={{ color: 'rgba(240,240,245,0.35)', marginBottom: 2 }}>Parrainages</div>
                          <div style={{ color: '#f0f0f5', fontWeight: 600 }}>{user.referrals || 0}</div>
                        </div>
                        <div>
                          <div style={{ color: 'rgba(240,240,245,0.35)', marginBottom: 2 }}>Inscrit le</div>
                          <div style={{ color: '#f0f0f5', fontWeight: 600 }}>{user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '—'}</div>
                        </div>
                      </div>
                      {adminRole && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: 'rgba(240,240,245,0.4)' }}>Rôle:</span>
                          <AdminDropdown compact options={ROLE_OPTIONS} value={user.role}
                            onChange={val => handleRoleChange(user.id, val)} width={140} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Staff Modal */}
      <AnimatePresence>
        {modal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setModal({ open: false })}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 380, padding: 24, background: '#0c0c1a', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f0f0f5', marginBottom: 18 }}>
                {modal.edit ? 'Modifier le staff' : 'Ajouter un staff'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nom complet"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5', fontSize: 13, outline: 'none' }} />
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Téléphone" type="tel"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5', fontSize: 13, outline: 'none' }} />
                <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mot de passe" type="password"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5', fontSize: 13, outline: 'none' }} />
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5', fontSize: 13, outline: 'none' }}>
                  <option value="moderator">Modérateur</option>
                  <option value="admin">Admin</option>
                </select>
                <motion.button onClick={handleCreateStaff} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  style={{ padding: '9px 0', borderRadius: 8, border: 'none', background: '#FF9900', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Enregistrer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
