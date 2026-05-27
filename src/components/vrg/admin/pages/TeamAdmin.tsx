'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Archive, Pencil, X, Save, GripVertical } from 'lucide-react'
import { api } from '@/lib/vrg-api'

interface TeamMember {
  id: number; name: string; role: string; photo: string
  order_index: number; archived: boolean
}

export default function TeamAdmin() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [modal, setModal] = useState<TeamMember | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.get<TeamMember[]>('/admin/team').then(data => {
      if (!cancelled) setMembers((data || []).sort((a, b) => a.order_index - b.order_index))
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const active = members.filter(m => !m.archived)
  const archived = members.filter(m => m.archived)

  const handleSave = async (member: Partial<TeamMember>) => {
    if (member.id) {
      await api.put(`/admin/team/${member.id}`, member)
    } else {
      await api.post('/admin/team', member)
    }
    setModal(null)
    load()
  }

  const handleArchive = async (id: number) => {
    await api.put(`/admin/team/${id}`, { archived: true })
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f5' }}>
          Membres ({active.length}) {archived.length > 0 && <span style={{ color: 'rgba(240,240,245,0.3)', fontWeight: 400 }}>· {archived.length} archivés</span>}
        </h3>
        <motion.button onClick={() => setModal({ id: 0, name: '', role: '', photo: '', order_index: members.length, archived: false })}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: '#FF9900', color: '#fff', fontSize: 13,
            fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <Plus size={15} /> Ajouter
        </motion.button>
      </div>

      {/* Team grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>Chargement...</div>
      ) : active.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>Aucun membre</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {active.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              style={{
                padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
              <GripVertical size={14} color="rgba(240,240,245,0.15)" style={{ flexShrink: 0 }} />
              {m.photo ? (
                <img src={m.photo} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(255,153,0,0.1)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: '#FF9900',
                }}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.4)', marginTop: 2 }}>{m.role || 'Membre'}</div>
                <div style={{ fontSize: 10, color: 'rgba(240,240,245,0.25)', marginTop: 2 }}>Position #{m.order_index}</div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => setModal(m)} title="Modifier"
                  style={{ width: 30, height: 30, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.05)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleArchive(m.id)} title="Archiver"
                  style={{ width: 30, height: 30, borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Archive size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,240,245,0.35)', marginBottom: 8 }}>Archivés</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {archived.map(m => (
              <div key={m.id} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.08)', fontSize: 12, color: 'rgba(240,240,245,0.4)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{m.name} — {m.role}</span>
                <button onClick={() => { api.put(`/admin/team/${m.id}`, { archived: false }).then(load) }}
                  style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: 11 }}>
                  Restaurer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <TeamModal member={modal} onSave={handleSave} onClose={() => setModal(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function TeamModal({ member, onSave, onClose }: { member: Partial<TeamMember>; onSave: (m: Partial<TeamMember>) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: member.name || '', role: member.role || '', photo: member.photo || '', order_index: member.order_index || 0 })
  const [saving, setSaving] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f0f0f5', fontSize: 13, outline: 'none',
  }

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    try { await onSave({ ...member, ...form }) } catch {}
    setSaving(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 380, padding: 24, background: '#0c0c1a', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f0f0f5' }}>
            {member.id ? 'Modifier' : 'Ajouter'} un membre
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(240,240,245,0.4)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input style={inputStyle} placeholder="Nom complet" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input style={inputStyle} placeholder="Rôle (ex: Fondateur, Designer...)" value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
          <input style={inputStyle} placeholder="URL de la photo" value={form.photo}
            onChange={e => setForm(f => ({ ...f, photo: e.target.value }))} />
          <input style={inputStyle} type="number" placeholder="Position (ordre)" value={form.order_index}
            onChange={e => setForm(f => ({ ...f, order_index: Number(e.target.value) }))} />
          <motion.button onClick={handleSave} disabled={saving || !form.name}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            style={{ padding: '9px 0', borderRadius: 8, border: 'none', background: '#FF9900', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving || !form.name ? 'not-allowed' : 'pointer', opacity: !form.name ? 0.5 : 1 }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Save size={14} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
            </span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
