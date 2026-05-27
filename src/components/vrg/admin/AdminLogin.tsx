'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Phone, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { api } from '@/lib/vrg-api'

interface AdminLoginProps {
  onSuccess: () => void
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!identifier || !password) { setError('Remplissez tous les champs'); return }

    setLoading(true)
    try {
      const res = await api.post<{ token: string; user: { role: string } }>('/auth/login', { phone: identifier, password })
      if (res.user.role !== 'admin' && res.user.role !== 'moderator') {
        api.clearToken()
        setError('Accès réservé aux administrateurs et modérateurs')
        return
      }
      api.setToken(res.token)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Identifiants invalides')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px 10px 40px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: '#f0f0f5', fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#07070f', padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%', maxWidth: 400, padding: 32,
          background: '#0c0c1a', borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: 'rgba(255,153,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', border: '1px solid rgba(255,153,0,0.2)',
          }}>
            <Lock size={22} color="#FF9900" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f5', marginBottom: 4 }}>VRG Admin</h1>
          <p style={{ fontSize: 13, color: 'rgba(240,240,245,0.45)' }}>Connexion au panneau d&apos;administration</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Phone size={16} color="rgba(240,240,245,0.35)"
              style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
            <input style={inputStyle} type="text" placeholder="Identifiant (téléphone ou nom)"
              value={identifier} onChange={e => setIdentifier(e.target.value)} autoComplete="username" />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={16} color="rgba(240,240,245,0.35)"
              style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
            <input style={{ ...inputStyle, paddingRight: 40 }} type={showPwd ? 'text' : 'password'}
              placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPwd(!showPwd)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,245,0.35)' }}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={14} color="#ef4444" />
              <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span>
            </motion.div>
          )}

          <motion.button type="submit" disabled={loading}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            style={{
              marginTop: 4, padding: '11px 0', borderRadius: 10, border: 'none',
              background: loading ? 'rgba(255,153,0,0.4)' : '#FF9900',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
