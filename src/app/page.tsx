'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VrgAuthProvider } from '@/contexts/vrg-auth-context'
import { VrgCartProvider } from '@/contexts/vrg-cart-context'
import { useAuth } from '@/contexts/vrg-auth-context'
import Navbar from '@/components/vrg/Navbar'
import Hero from '@/components/vrg/Hero'
import Features from '@/components/vrg/Features'
import Products from '@/components/vrg/Products'
import Gallery from '@/components/vrg/Gallery'
import Pricing from '@/components/vrg/Pricing'
import Team from '@/components/vrg/Team'
import CTA from '@/components/vrg/CTA'
import Footer from '@/components/vrg/Footer'
import Marquee from '@/components/vrg/Marquee'
import ScrollProgress from '@/components/vrg/ScrollProgress'
import AuthModal from '@/components/vrg/AuthModal'
import AccountPanel from '@/components/vrg/AccountPanel'
import CartPanel from '@/components/vrg/CartPanel'
import SupportChat from '@/components/vrg/SupportChat'
import AdminLogin from '@/components/vrg/admin/AdminLogin'
import AdminLayout from '@/components/vrg/admin/AdminLayout'
import { api } from '@/lib/vrg-api'
import ErrorBoundary from '@/components/vrg/ErrorCatch'

/* ─── Public Site ─── */
function PublicSite({
  showAuth, setShowAuth, showAccount, setShowAccount, showCart, setShowCart,
}: {
  showAuth: boolean; setShowAuth: (v: boolean) => void
  showAccount: boolean; setShowAccount: (v: boolean) => void
  showCart: boolean; setShowCart: (v: boolean) => void
}) {
  const { user } = useAuth()

  const handleOpenAuth = () => {
    if (user) setShowAccount(true)
    else setShowAuth(true)
  }

  const handleAuthSuccess = (isAdmin?: boolean) => {
    setShowAuth(false)
    if (isAdmin) {
      // The hashchange listener in AppContent will pick this up and set isAdmin=true
      window.location.hash = '#admin'
    } else {
      setShowAccount(true)
    }
  }

  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <ScrollProgress />
      <Navbar
        onOpenAuth={handleOpenAuth}
        onOpenAccount={() => setShowAccount(true)}
        onOpenCart={() => setShowCart(true)}
      />
      <main>
        <Hero />
        <Features />
        <Products />
        <Gallery />
        <Pricing />
        <Team />
        <CTA />
      </main>
      <Footer />
      <Marquee />

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
      />
      <AccountPanel
        isOpen={showAccount}
        onClose={() => setShowAccount(false)}
      />
      <CartPanel
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        onOpenAuth={() => { setShowCart(false); setShowAuth(true) }}
      />
    </div>
  )
}

/* ─── Admin Panel ─── */
function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('vrg_token') : null
      if (!token) { if (!cancelled) setAuthed(false); return }
      try {
        const r = await api.get<{ user: { role: string } }>('/auth/me')
        if (!cancelled) {
          if (r.user.role === 'admin' || r.user.role === 'moderator') setAuthed(true)
          else { api.clearToken(); setAuthed(false) }
        }
      } catch {
        if (!cancelled) setAuthed(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  if (authed === null) {
    return (
      <div style={{
        minHeight: '100dvh', background: '#07070f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 24, height: 24, border: '2px solid rgba(255,153,0,0.2)', borderTopColor: '#FF9900', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />
  }

  return <AdminLayout onLogout={onLogout} />
}

/* ─── Main App with hash routing ─── */
function AppContent() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [showCart, setShowCart] = useState(false)

  useEffect(() => {
    const onHash = () => {
      setIsAdmin(window.location.hash === '#admin')
    }
    onHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Keyboard shortcut: Ctrl+Shift+A to toggle admin
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        if (window.location.hash === '#admin') {
          window.location.hash = ''
        } else {
          window.location.hash = '#admin'
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleAdminLogout = useCallback(() => {
    api.clearToken()
    window.location.hash = ''
    setIsAdmin(false)
  }, [])

  return (
    <AnimatePresence mode="wait">
      {isAdmin ? (
        <motion.div
          key="admin"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <AdminPanel onLogout={handleAdminLogout} />
        </motion.div>
      ) : (
        <motion.div
          key="public"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <PublicSite
            showAuth={showAuth} setShowAuth={setShowAuth}
            showAccount={showAccount} setShowAccount={setShowAccount}
            showCart={showCart} setShowCart={setShowCart}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function Page() {
  return (
    <ErrorBoundary>
      <VrgAuthProvider>
        <VrgCartProvider>
          <AppContent />
          <SupportChat />
        </VrgCartProvider>
      </VrgAuthProvider>
    </ErrorBoundary>
  )
}
