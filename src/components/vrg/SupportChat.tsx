'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, Send, Minimize2, Bot, User, Sparkles, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/vrg-auth-context'

const BASE = '/api'

function ah() {
  return {
    Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('vrg_token') : ''}`,
    'Content-Type': 'application/json',
  }
}

function fmtTime(ts: string) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

interface ChatMsg {
  id: string
  sender_id: number
  sender_name?: string
  body: string
  created_at: string
}

export default function SupportChat() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [text, setText] = useState('')
  const [roomId, setRoomId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [lastAt, setLastAt] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)
  const [aiEnabled, setAiEnabled] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const aiRequestId = useRef<number>(0) // track AI request generation to cancel stale responses

  useEffect(() => {
    if (!user) { setMessages([]); setRoomId(null); setLastAt(null); setUnread(0); return }
    fetch(`${BASE}/chat/support`, { headers: ah() })
      .then(r => r.json())
      .then((d: any) => {
        const rid = d.room?.id || d.room_id
        setRoomId(rid)
        const msgs = d.messages || []
        setMessages(msgs)
        if (msgs.length > 0) setLastAt(msgs[msgs.length - 1].created_at)
      })
      .catch(() => {})
  }, [user?.id])

  useEffect(() => {
    if (!roomId || !user) return
    const id = setInterval(async () => {
      try {
        const url = `${BASE}/chat/support/poll?roomId=${roomId}${lastAt ? '&since=' + encodeURIComponent(lastAt) : ''}`
        const r = await fetch(url, { headers: ah() })
        const data = await r.json()
        if (Array.isArray(data) && data.length > 0) {
          setMessages(prev => [...prev, ...data])
          setLastAt(data[data.length - 1].created_at)
          if (!open) setUnread(n => n + data.filter((m: ChatMsg) => m.sender_id !== user.id).length)
        }
      } catch { /* ignore */ }
    }, 4000)
    return () => clearInterval(id)
  }, [roomId, lastAt, open, user?.id])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'instant' }); inputRef.current?.focus() }, 120)
    }
  }, [open])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!text.trim() || !user || !roomId) return

    const trimmed = text.trim()

    // Check for commands first — commands bypass sending/aiThinking lock
    if (trimmed.startsWith('/')) {
      handleCommand(trimmed)
      return
    }

    // Prevent sending regular messages while a previous message is being sent
    if (sending || aiThinking) return

    setSending(true)
    const optimistic: ChatMsg = { id: `opt-${Date.now()}`, sender_id: user.id, sender_name: user.name, body: trimmed, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    setText('')
    try {
      const r = await fetch(`${BASE}/chat/support/messages`, { method: 'POST', headers: ah(), body: JSON.stringify({ body: optimistic.body, roomId }) })
      const msg = await r.json()
      if (msg.id) {
        setMessages(prev => prev.map(m => m.id === optimistic.id ? (msg.message || msg) : m))
        setLastAt((msg.message || msg).created_at)
      }

      // If AI is enabled, trigger AI auto-reply
      if (aiEnabled && msg.message) {
        // Increment request ID — if /stop is typed before this resolves, the ID will differ
        const reqId = ++aiRequestId.current
        setAiThinking(true)
        try {
          const aiRes = await fetch(`${BASE}/chat/assistant`, {
            method: 'POST',
            headers: ah(),
            body: JSON.stringify({ message: optimistic.body, roomId }),
          })
          const aiData = await aiRes.json()
          // Discard response if AI was stopped while this request was in flight
          if (reqId !== aiRequestId.current) return
          if (aiData.message && aiData.saved) {
            setMessages(prev => [...prev, aiData.message])
            setLastAt(aiData.message.created_at)
          } else if (aiData.reply && !aiData.saved) {
            const localAiMsg: ChatMsg = {
              id: `ai-${Date.now()}`,
              sender_id: 0,
              sender_name: 'Assistant VRG',
              body: aiData.reply,
              created_at: new Date().toISOString(),
            }
            setMessages(prev => [...prev, localAiMsg])
          }
        } catch {
          // AI failed silently — human support still works
        } finally {
          if (reqId === aiRequestId.current) setAiThinking(false)
        }
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally { setSending(false) }
  }

  const isBotMessage = (msg: ChatMsg) => msg.sender_id === 0 || msg.sender_name === 'Assistant VRG'

  // ─── Chat commands ───
  const COMMANDS = [
    { cmd: '/stop', label: '⏹ Arrêter l\'IA', desc: 'Désactive les réponses automatiques de l\'assistant' },
    { cmd: '/reset', label: '🔄 Nouvelle discussion', desc: 'Vide la conversation et recommence' },
    { cmd: '/human', label: '👤 Parler à un humain', desc: 'Bascule vers le support humain' },
    { cmd: '/ai', label: '🤖 Activer l\'IA', desc: 'Réactive l\'assistant virtuel' },
  ]

  const handleCommand = (cmd: string): boolean => {
    const c = cmd.trim().toLowerCase()
    if (c === '/stop' || c === '/human') {
      setAiEnabled(false)
      // Cancel any in-flight AI request by incrementing the request ID
      aiRequestId.current++
      setAiThinking(false)
      const sysMsg: ChatMsg = {
        id: `sys-${Date.now()}`, sender_id: 0, sender_name: 'Système',
        body: c === '/stop'
          ? '⏹ Assistant IA désactivé. Vos messages seront traités par l\'équipe support.'
          : '👤 Mode support humain activé. Un membre de l\'équipe vous répondra bientôt.',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, sysMsg])
      setText('')
      inputRef.current?.focus()
      return true
    }
    if (c === '/ai') {
      setAiEnabled(true)
      const sysMsg: ChatMsg = {
        id: `sys-${Date.now()}`, sender_id: 0, sender_name: 'Système',
        body: '🤖 Assistant IA réactivé. Je suis là pour vous aider !',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, sysMsg])
      setText('')
      return true
    }
    if (c === '/reset') {
      setMessages([])
      setLastAt(null)
      setAiEnabled(true)
      setText('')
      return true
    }
    if (c === '/help' || c === '/cmd') {
      const sysMsg: ChatMsg = {
        id: `sys-${Date.now()}`, sender_id: 0, sender_name: 'Système',
        body: '📋 Commandes disponibles :\n\n/stop — Arrêter l\'assistant IA\n/human — Passer au support humain\n/ai — Réactiver l\'assistant IA\n/reset — Nouvelle discussion\n/help — Voir les commandes',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, sysMsg])
      setText('')
      return true
    }
    return false
  }

  const renderSysMsg = (msg: ChatMsg) => {
    const lines = msg.body.split('\n')
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
        <div style={{
          maxWidth: '88%', padding: '8px 14px', borderRadius: 10,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 11.5, color: 'rgba(240,240,245,0.6)', lineHeight: 1.6,
          whiteSpace: 'pre-line', textAlign: 'center',
        }}>
          {lines.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 20, zIndex: 99999,
          width: 380, height: 520, borderRadius: 20,
          background: 'linear-gradient(180deg, #13132a 0%, #0d0d1e 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,153,0,0.08)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, rgba(255,153,0,0.12) 0%, rgba(230,126,0,0.06) 100%)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: aiEnabled ? 'linear-gradient(135deg, #FF9900 0%, #e06000 100%)' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {aiEnabled ? <Bot size={18} color="#fff" /> : <User size={18} color="#fff" />}
              </div>
              <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: aiEnabled ? '#a855f7' : '#22c55e', border: '2px solid #13132a' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#f0f0f5', letterSpacing: '-0.2px' }}>
                {aiEnabled ? 'Assistant VaRyGasy' : 'Support VaRyGasy'}
              </div>
              <div style={{ fontSize: 11, color: aiEnabled ? '#a855f7' : '#22c55e', fontWeight: 600, marginTop: 1 }}>
                {aiEnabled ? '🤖 IA en ligne · répond instantanément' : 'En ligne · répond rapidement'}
              </div>
            </div>

            {/* AI toggle */}
            <button
              onClick={() => setAiEnabled(!aiEnabled)}
              title={aiEnabled ? 'Passer au support humain' : 'Activer l\'assistant IA'}
              style={{
                background: aiEnabled ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${aiEnabled ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 8, padding: '5px 8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                color: aiEnabled ? '#a855f7' : 'rgba(240,240,245,0.5)',
                fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {aiEnabled ? <Sparkles size={11} /> : <User size={11} />}
              <span className="hidden-mobile">{aiEnabled ? 'IA Active' : 'Humain'}</span>
            </button>

            <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(240,240,245,0.5)' }}>
              <Minimize2 size={13} />
            </button>
          </div>

          {/* Body */}
          {!user ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, lineHeight: 1 }}>🔐</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f5' }}>Connexion requise</div>
              <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.4)', lineHeight: 1.6 }}>Connectez-vous à votre compte pour écrire à notre équipe support.</div>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Welcome message */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: aiEnabled ? 'linear-gradient(135deg,#a855f7,#7c3aed)' : 'linear-gradient(135deg,#FF9900,#e06000)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {aiEnabled ? <Bot size={14} color="#fff" /> : <span style={{ fontWeight: 800, fontSize: 12, color: '#fff' }}>V</span>}
                  </div>
                  <div style={{ maxWidth: '78%', padding: '9px 13px', borderRadius: '18px 18px 18px 4px', background: aiEnabled ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.09)', border: `1px solid ${aiEnabled ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.08)'}`, fontSize: 12.5, color: '#dde0f0', lineHeight: 1.5 }}>
                    {aiEnabled
                      ? `Bonjour ${user.name} 👋 Je suis l'assistant VaRyGasy. Je peux t'aider avec les produits, commandes, livraisons et plus encore. Comment puis-je t'aider ?`
                      : `Bonjour ${user.name} 👋 Comment pouvons-nous vous aider ?`
                    }
                  </div>
                </div>

                {/* AI quick actions (only in AI mode and empty chat) */}
                {aiEnabled && messages.length === 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, padding: '0 4px' }}>
                    {['📦 Voir les produits', '🚚 Zone de livraison', '💳 Mode de paiement', '📞 Support humain'].map((action) => (
                      <button
                        key={action}
                        onClick={() => {
                          if (action.includes('Support humain')) {
                            handleCommand('/human')
                          } else {
                            setText(action.replace(/^[^\s]+\s/, ''))
                            inputRef.current?.focus()
                          }
                        }}
                        style={{
                          padding: '6px 12px', borderRadius: 16,
                          background: 'rgba(168,85,247,0.1)',
                          border: '1px solid rgba(168,85,247,0.2)',
                          color: '#c4b5fd', fontSize: 11, fontWeight: 500,
                          cursor: 'pointer', transition: 'all 0.15s',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168,85,247,0.2)' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168,85,247,0.1)' }}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}

                {/* Messages */}
                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.id
                  const isBot = isBotMessage(msg)
                  const isSys = msg.sender_name === 'Système'
                  if (isSys) return renderSysMsg(msg)
                  const prevSame = i > 0 && messages[i - 1].sender_id === msg.sender_id
                  const nextSame = i < messages.length - 1 && messages[i + 1].sender_id === msg.sender_id
                  const isOpt = String(msg.id).startsWith('opt-')

                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 7, marginTop: prevSame ? 2 : 10 }}>
                      {!isMe && (
                        <div style={{ width: 28, flexShrink: 0 }}>
                          {!nextSame && (
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: isBot ? 'linear-gradient(135deg,#a855f7,#7c3aed)' : 'linear-gradient(135deg,#FF9900,#e06000)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {isBot ? <Bot size={14} color="#fff" /> : <span style={{ fontWeight: 800, fontSize: 12, color: '#fff' }}>V</span>}
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 1 }}>
                        <div style={{
                          padding: '9px 13px',
                          borderRadius: isMe ? (prevSame ? (nextSame ? '14px 4px 4px 14px' : '14px 4px 18px 14px') : (nextSame ? '18px 4px 4px 14px' : '18px 4px 18px 18px')) : (prevSame ? (nextSame ? '4px 14px 14px 4px' : '4px 18px 18px 4px') : (nextSame ? '18px 18px 14px 4px' : '18px 18px 18px 4px')),
                          background: isMe ? 'linear-gradient(135deg, rgba(255,153,0,0.3), rgba(220,110,0,0.22))' : isBot ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.09)',
                          border: `1px solid ${isMe ? 'rgba(255,153,0,0.4)' : isBot ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.08)'}`,
                          color: isMe ? '#ffd580' : isBot ? '#e0d4ff' : '#dde0f0',
                          fontSize: 12.5, lineHeight: 1.5, wordBreak: 'break-word',
                          opacity: isOpt ? 0.6 : 1, transition: 'opacity 0.2s',
                        }}>
                          {msg.body}
                        </div>
                        <span style={{ fontSize: 10, color: 'rgba(240,240,245,0.2)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {fmtTime(msg.created_at)}
                          {isBot && !nextSame && (
                            <span style={{ fontSize: 9, color: 'rgba(168,85,247,0.5)', fontWeight: 600 }}>🤖 IA</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {/* AI thinking indicator */}
                {aiThinking && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, marginTop: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#a855f7,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bot size={14} color="#fff" />
                    </div>
                    <div style={{ padding: '9px 16px', borderRadius: '18px 18px 18px 4px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.15)' }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', animation: 'vrgBounce 1.4s ease-in-out infinite' }} />
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', animation: 'vrgBounce 1.4s ease-in-out 0.2s infinite' }} />
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', animation: 'vrgBounce 1.4s ease-in-out 0.4s infinite' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} style={{ height: 4 }} />
              </div>

              {/* AI mode banner */}
              {aiEnabled && (
                <div style={{ padding: '4px 14px', background: 'rgba(168,85,247,0.06)', borderTop: '1px solid rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Sparkles size={10} color="#a855f7" />
                  <span style={{ fontSize: 10, color: 'rgba(168,85,247,0.7)', fontWeight: 500 }}>Assistant IA actif — les messages sont aussi visibles par l&apos;équipe</span>
                </div>
              )}

              {/* Input */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <input
                  ref={inputRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder={aiEnabled ? 'Demander à l\'assistant…' : 'Écrire un message…'}
                  disabled={sending || (aiThinking && !text.trim().startsWith('/'))}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.07)',
                    border: `1px solid ${aiEnabled ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 20, padding: '9px 15px', color: '#f0f0f5', fontSize: 13,
                    outline: 'none', transition: 'border-color 0.15s',
                  }}
                />
                <button
                  onClick={send}
                  disabled={!text.trim() || ((sending || aiThinking) && !text.trim().startsWith('/'))}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
                    cursor: text.trim() && (text.trim().startsWith('/') || !(sending || aiThinking)) ? 'pointer' : 'default',
                    background: text.trim() && (text.trim().startsWith('/') || !(sending || aiThinking))
                      ? (aiEnabled ? 'linear-gradient(135deg,#a855f7,#7c3aed)' : 'linear-gradient(135deg,#FF9900,#e06000)')
                      : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s, transform 0.1s',
                    transform: text.trim() ? 'scale(1)' : 'scale(0.9)',
                  }}
                >
                  {aiThinking ? <RefreshCw size={14} color="rgba(168,85,247,0.5)" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} color={text.trim() ? '#fff' : 'rgba(240,240,245,0.25)'} style={{ marginLeft: 1 }} />}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Chat button */}
      <button onClick={() => setOpen(o => !o)} title="Support VaRyGasy"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 99999, width: 56, height: 56,
          borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: open
            ? 'linear-gradient(135deg,#555,#333)'
            : aiEnabled
              ? 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)'
              : 'linear-gradient(135deg, #FF9900 0%, #e06000 100%)',
          boxShadow: open
            ? '0 4px 16px rgba(0,0,0,0.4)'
            : aiEnabled
              ? '0 4px 20px rgba(168,85,247,0.5), 0 0 0 0 rgba(168,85,247,0.3)'
              : '0 4px 20px rgba(255,140,0,0.5), 0 0 0 0 rgba(255,140,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s, box-shadow 0.2s, transform 0.15s',
        }}
      >
        {open
          ? <X size={22} color="#fff" />
          : aiEnabled
            ? <Bot size={24} color="#fff" />
            : <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.477 2 2 6.268 2 11.5c0 2.7 1.17 5.138 3.05 6.88L4 22l4.027-1.95C9.27 20.66 10.61 21 12 21c5.523 0 10-4.268 10-9.5S17.523 2 12 2z" fill="white"/></svg>
        }
        {!open && unread > 0 && (
          <span style={{ position: 'absolute', top: -3, right: -3, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 99, minWidth: 18, height: 18, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #080810', boxShadow: '0 2px 6px rgba(239,68,68,0.5)' }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      <style>{`
        @keyframes vrgBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}
