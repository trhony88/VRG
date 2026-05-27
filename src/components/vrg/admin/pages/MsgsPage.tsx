'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Send, Search, Users, MessageCircle, UserCheck, Headphones, Sparkles } from 'lucide-react'
import { api } from '@/lib/vrg-api'

interface Message {
  id: number; from_id: number; to_id: number; content: string
  created_at: string; from_name: string
}

interface ChatUser {
  id: number; name: string; phone: string; role?: string
  unread?: number
}

const TABS = [
  { id: 'admins', label: 'Admins', icon: <Headphones size={15} /> },
  { id: 'team', label: 'Équipe', icon: <UserCheck size={15} /> },
  { id: 'direct', label: 'Direct', icon: <MessageCircle size={15} /> },
  { id: 'clients', label: 'Clients', icon: <Users size={15} /> },
]

export default function MsgsPage() {
  const [tab, setTab] = useState('admins')
  const [users, setUsers] = useState<ChatUser[]>([])
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadUsers = () => {
    api.get<{ users: ChatUser[] }>(`/admin/messages/users?tab=${tab}`).then(data => {
      setUsers(data.users || [])
    }).catch(() => { setUsers([]) }).finally(() => setLoading(false))
  }

  const loadMessages = () => {
    if (!selectedUser) return
    api.get<Message[]>(`/admin/messages/${selectedUser.id}`).then(data => {
      setMessages(data || [])
    }).catch(() => {})
  }

  useEffect(() => {
    loadUsers()
  }, [tab])

  useEffect(() => {
    if (!selectedUser) return
    loadMessages()
    pollRef.current = setInterval(loadMessages, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selectedUser])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !selectedUser) return
    const msg = input.trim()
    setInput('')
    try {
      await api.post('/admin/messages', { to_id: selectedUser.id, content: msg })
      loadMessages()
    } catch {}
  }

  const handleAiSuggest = async () => {
    if (!selectedUser || messages.length === 0 || aiSuggesting) return
    setAiSuggesting(true)
    try {
      // Build conversation context from last messages
      const recentMsgs = messages.slice(-8).map(m => `${m.from_name}: ${m.content}`).join('\n')
      const res = await api.post<{ reply: string }>('/chat/assistant', {
        message: `[Contexte conversation admin]:\n${recentMsgs}\n\nEn tant qu'admin, suggère une réponse professionnelle et utile pour le dernier message du client. Réponds uniquement avec la suggestion, sans guillemets ni préfixe.`,
        roomId: 0,
      })
      if (res.reply) setInput(res.reply)
    } catch {}
    finally { setAiSuggesting(false) }
  }

  const filteredUsers = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search)
  )

  const formatTime = (date: string) => {
    const d = new Date(date)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ display: 'flex', gap: 14, height: 'calc(100dvh - 96px)', overflow: 'hidden' }}>
      {/* Left panel - User list */}
      <div style={{
        width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'rgba(255,255,255,0.02)', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setSelectedUser(null); setMessages([]) }}
                style={{
                  flex: 1, padding: '10px 4px', border: 'none', background: 'transparent',
                  color: active ? '#FF9900' : 'rgba(240,240,245,0.4)',
                  fontSize: 10, cursor: 'pointer', display: 'flex',
                  flexDirection: 'column', alignItems: 'center', gap: 4,
                  borderBottom: active ? '2px solid #FF9900' : '2px solid transparent',
                }}>
                {t.icon}
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div style={{ padding: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} color="rgba(240,240,245,0.3)"
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
              style={{
                width: '100%', padding: '7px 8px 7px 28px', borderRadius: 6,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                color: '#f0f0f5', fontSize: 12, outline: 'none',
              }} />
          </div>
        </div>

        {/* User list */}
        <div style={{ flex: 1, overflowY: 'auto' }} className="vrg-scroll">
          {filteredUsers.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 12 }}>Aucun contact</div>
          ) : (
            filteredUsers.map(u => {
              const active = selectedUser?.id === u.id
              return (
                <button key={u.id} onClick={() => setSelectedUser(u)}
                  style={{
                    width: '100%', padding: '10px 12px', border: 'none', background: active ? 'rgba(255,153,0,0.08)' : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: active ? 'rgba(255,153,0,0.15)' : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: active ? '#FF9900' : 'rgba(240,240,245,0.5)',
                  }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: '#f0f0f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(240,240,245,0.3)' }}>{u.phone}</div>
                  </div>
                  {(u.unread || 0) > 0 && (
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', background: '#FF9900',
                      color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {u.unread > 9 ? '9+' : u.unread}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right panel - Chat */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'rgba(255,255,255,0.02)', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
      }}>
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,153,0,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#FF9900',
              }}>
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5' }}>{selectedUser.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)' }}>{selectedUser.phone}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }} className="vrg-scroll">
              {messages.length === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(240,240,245,0.2)', fontSize: 13 }}>
                  Aucun message
                </div>
              )}
              {messages.map(msg => {
                const isMine = msg.from_id === 0 // assuming admin is from_id=0
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      alignSelf: isMine ? 'flex-end' : 'flex-start',
                      maxWidth: '75%', display: 'flex', flexDirection: 'column',
                    }}>
                    <div style={{
                      padding: '8px 12px', borderRadius: isMine ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      background: isMine ? 'rgba(255,153,0,0.15)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isMine ? 'rgba(255,153,0,0.2)' : 'rgba(255,255,255,0.08)'}`,
                      color: '#f0f0f5', fontSize: 13, lineHeight: 1.4,
                    }}>
                      {msg.content}
                    </div>
                    <div style={{
                      fontSize: 10, color: 'rgba(240,240,245,0.25)',
                      marginTop: 3, alignSelf: isMine ? 'flex-end' : 'flex-start',
                    }}>
                      {!isMine && <span style={{ marginRight: 4 }}>{msg.from_name}</span>}
                      {formatTime(msg.created_at)}
                    </div>
                  </motion.div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: 12, borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                placeholder="Écrire un message..."
                style={{
                  flex: 1, padding: '9px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f0f0f5', fontSize: 13, outline: 'none',
                }} />
              <motion.button onClick={handleAiSuggest} disabled={aiSuggesting || messages.length === 0}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                title="Suggestion IA"
                style={{
                  width: 38, height: 38, borderRadius: 8, border: '1px solid rgba(168,85,247,0.2)',
                  background: aiSuggesting ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.06)',
                  color: '#a855f7', cursor: (!aiSuggesting && messages.length > 0) ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'opacity 0.2s',
                  opacity: aiSuggesting ? 0.5 : 1,
                }}>
                <Sparkles size={16} />
              </motion.button>
              <motion.button onClick={handleSend} disabled={!input.trim()}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                style={{
                  width: 38, height: 38, borderRadius: 8, border: 'none',
                  background: input.trim() ? '#FF9900' : 'rgba(255,153,0,0.3)',
                  color: '#fff', cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                <Send size={16} />
              </motion.button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
            <MessageCircle size={32} color="rgba(240,240,245,0.15)" />
            <span style={{ color: 'rgba(240,240,245,0.25)', fontSize: 13 }}>Sélectionnez une conversation</span>
          </div>
        )}
      </div>
    </div>
  )
}
