'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, RotateCcw } from 'lucide-react'
import { api } from '@/lib/vrg-api'

interface SettingEntry {
  key: string; value: string; module: string
}

const MODULES = [
  { id: 'ticker', label: 'Ticker', color: '#fbbf24' },
  { id: 'hero', label: 'Hero', color: '#FF9900' },
  { id: 'livraison', label: 'Livraison', color: '#60a5fa' },
  { id: 'contact', label: 'Contact', color: '#34d399' },
  { id: 'general', label: 'Général', color: '#a78bfa' },
]

export default function SettingsAdmin() {
  const [settings, setSettings] = useState<SettingEntry[]>([])
  const [form, setForm] = useState<Record<string, string>>({})
  const [activeModule, setActiveModule] = useState('ticker')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.get<SettingEntry[]>('/admin/settings').then(data => {
      if (!cancelled) {
        setSettings(data || [])
        const f: Record<string, string> = {}
        ;(data || []).forEach(s => { f[s.key] = s.value })
        setForm(f)
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const moduleSettings = settings.filter(s => s.module === activeModule)

  const loadSettings = () => {
    const f: Record<string, string> = {}
    settings.forEach(s => { f[s.key] = s.value })
    setForm(f)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/admin/settings', form)
    } catch {}
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f0f0f5', fontSize: 13, outline: 'none',
    transition: 'border-color 0.2s',
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>Chargement...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Module tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {MODULES.map(m => {
          const active = activeModule === m.id
          return (
            <button key={m.id} onClick={() => setActiveModule(m.id)}
              style={{
                padding: '7px 16px', borderRadius: 8, border: 'none',
                background: active ? `${m.color}18` : 'rgba(255,255,255,0.04)',
                color: active ? m.color : 'rgba(240,240,245,0.5)',
                fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer',
                border: active ? `1px solid ${m.color}30` : '1px solid transparent',
              }}>
              {m.label}
              <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.6 }}>
                ({settings.filter(s => s.module === m.id).length})
              </span>
            </button>
          )
        })}
      </div>

      {/* Settings form */}
      <motion.div key={activeModule} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'rgba(255,255,255,0.02)', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)', padding: 20,
        }}>
        {moduleSettings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>
            Aucun paramètre dans ce module
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {moduleSettings.map(s => (
              <div key={s.key}>
                <label style={{ display: 'block', fontSize: 12, color: 'rgba(240,240,245,0.5)', marginBottom: 6, fontWeight: 500 }}>
                  {s.key}
                </label>
                <input value={form[s.key] || ''} onChange={e => setForm(f => ({ ...f, [s.key]: e.target.value }))}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,153,0,0.4)'}
                  onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'}
                  style={inputStyle} />
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <motion.button onClick={loadSettings} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          style={{
            padding: '9px 18px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
            color: '#f0f0f5', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <RotateCcw size={14} /> Réinitialiser
        </motion.button>
        <motion.button onClick={handleSave} disabled={saving}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: saving ? 'rgba(255,153,0,0.4)' : '#FF9900',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <Save size={14} /> {saving ? 'Enregistrement...' : 'Enregistrer tout'}
        </motion.button>
      </div>
    </div>
  )
}
