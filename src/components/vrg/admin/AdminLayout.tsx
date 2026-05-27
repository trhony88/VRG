'use client'

import React, { useState, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FileText, ShoppingBag, Package, Users, MessageSquare,
  Settings, UserCog, History, LogOut, Menu, X, ChevronLeft, Bell, Shield, Eye,
} from 'lucide-react'
import { api } from '@/lib/vrg-api'

/* ─── types ─── */
interface AdminUser {
  id: number; name: string; phone: string; role: string
}

interface NavItem {
  id: string; label: string; icon: React.ReactNode; adminOnly?: boolean
}

/* ─── nav config ─── */
const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'products', label: 'Articles', icon: <FileText size={18} /> },
  { id: 'orders', label: 'Commandes', icon: <ShoppingBag size={18} /> },
  { id: 'stocks', label: 'Stocks', icon: <Package size={18} /> },
  { id: 'team', label: 'Équipe', icon: <Users size={18} /> },
  { id: 'messages', label: 'Messages', icon: <MessageSquare size={18} /> },
  { id: 'settings', label: 'Paramètres', icon: <Settings size={18} />, adminOnly: true },
  { id: 'users', label: 'Clients', icon: <UserCog size={18} />, adminOnly: true },
  { id: 'logs', label: 'Historique', icon: <History size={18} />, adminOnly: true },
]

/* ─── lazy page components (declared outside render) ─── */
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const ProductsPage = lazy(() => import('./pages/Products'))
const OrdersPage = lazy(() => import('./pages/Orders'))
const StocksPage = lazy(() => import('./pages/Stocks'))
const TeamPage = lazy(() => import('./pages/TeamAdmin'))
const MessagesPage = lazy(() => import('./pages/MsgsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsAdmin'))
const UsersPage = lazy(() => import('./pages/Users'))
const LogsPage = lazy(() => import('./pages/LogsPage'))

const PAGE_MAP: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  dashboard: DashboardPage,
  products: ProductsPage,
  orders: OrdersPage,
  stocks: StocksPage,
  team: TeamPage,
  messages: MessagesPage,
  settings: SettingsPage,
  users: UsersPage,
  logs: LogsPage,
}

interface AdminLayoutProps {
  onLogout: () => void
}

export default function AdminLayout({ onLogout }: AdminLayoutProps) {
  const [page, setPage] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [alertCount, setAlertCount] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const r = await api.get<{ user: AdminUser }>('/auth/me')
        if (!cancelled) setAdminUser(r.user)
      } catch {}
      try {
        const r = await api.get<{ count: number }>('/admin/orders/pending-count')
        if (!cancelled) setAlertCount(r.count || 0)
      } catch {}
    }
    init()
    return () => { cancelled = true }
  }, [])

  // Refresh alert count when orders are updated
  useEffect(() => {
    const handler = async () => {
      try {
        const r = await api.get<{ count: number }>('/admin/orders/pending-count')
        setAlertCount(r.count || 0)
      } catch {}
    }
    window.addEventListener('admin-data-refresh', handler)
    return () => window.removeEventListener('admin-data-refresh', handler)
  }, [])

  const isAdmin = adminUser?.role === 'admin'
  const visibleNav = NAV.filter(n => !n.adminOnly || isAdmin)
  const activeNav = NAV.find(n => n.id === page)

  const navigate = (id: string) => { setPage(id); setMobileOpen(false) }

  const PageComponent = PAGE_MAP[page] || PAGE_MAP.dashboard

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#07070f', overflow: 'hidden' }}>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2 }}
        style={{
          background: '#0c0c1a', borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
          zIndex: 50, overflow: 'hidden',
          position: 'fixed', top: 0, left: 0, bottom: 0,
          transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : undefined,
          transition: isMobile ? 'transform 0.25s ease' : undefined,
        }}
      >
        {/* Logo */}
        <div style={{
          padding: collapsed ? '16px 0' : '16px 16px', display: 'flex',
          alignItems: 'center', gap: 10, minHeight: 56,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #FF9900, #ca8a04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, color: '#fff',
          }}>
            V
          </div>
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ fontWeight: 700, fontSize: 15, color: '#f0f0f5', whiteSpace: 'nowrap' }}>
              VaRy<span style={{ color: '#FF9900' }}>Gasy</span>
              <span style={{ fontSize: 9, color: 'rgba(240,240,245,0.35)', marginLeft: 6, fontWeight: 500 }}>ADMIN</span>
            </motion.span>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '8px 6px', overflowY: 'auto' }} className="vrg-scroll">
          {visibleNav.map(item => {
            const active = item.id === page
            return (
              <button key={item.id} onClick={() => navigate(item.id)}
                title={collapsed ? item.label : undefined}
                style={{
                  width: '100%', padding: collapsed ? '10px 0' : '10px 12px',
                  borderRadius: 8, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  marginBottom: 2, transition: 'all 0.15s',
                  background: active ? 'rgba(255,153,0,0.1)' : 'transparent',
                  color: active ? '#FF9900' : 'rgba(240,240,245,0.55)',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = '#f0f0f5' } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,240,245,0.55)' } }}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Bottom user section */}
        <div style={{
          padding: collapsed ? '10px 0' : '10px 12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {!collapsed && adminUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '0 4px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,153,0,0.12)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Shield size={16} color="#FF9900" />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {adminUser.name}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)' }}>
                  {adminUser.role === 'admin' ? 'Admin' : 'Modérateur'}
                </div>
              </div>
            </div>
          )}
          <button onClick={onLogout}
            style={{
              width: '100%', padding: collapsed ? '8px 0' : '8px 12px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 10, background: 'transparent',
              color: 'rgba(239,68,68,0.7)', fontSize: 13, transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <LogOut size={16} />{!collapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        marginLeft: collapsed ? 64 : 240,
        transition: 'margin-left 0.2s',
        overflow: 'hidden',
      }}
        className="admin-main-content"
      >
        {/* Top bar */}
        <header style={{
          height: 56, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(12,12,26,0.8)', backdropFilter: 'blur(12px)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="admin-mobile-menu"
              style={{ display: 'none', background: 'none', border: 'none', color: '#f0f0f5', cursor: 'pointer', padding: 4 }}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <button onClick={() => setCollapsed(!collapsed)}
              className="admin-collapse-btn"
              style={{ background: 'none', border: 'none', color: 'rgba(240,240,245,0.5)', cursor: 'pointer', padding: 4 }}>
              <ChevronLeft size={18} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: activeNav?.icon ? '#FF9900' : 'rgba(240,240,245,0.5)' }}>{activeNav?.icon}</span>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f5' }}>{activeNav?.label || 'Dashboard'}</h2>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => { window.location.hash = '' }} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
              background: 'rgba(255,153,0,0.08)',
              border: '1px solid rgba(255,153,0,0.2)',
              color: '#FF9900', fontSize: 12, fontWeight: 600,
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,153,0,0.15)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,153,0,0.08)'
              }}
            >
              <Eye size={14} />
              <span className="admin-toggle-label">Voir le site</span>
            </button>
            <button onClick={() => navigate('orders')} style={{
              position: 'relative', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
              padding: 8, cursor: 'pointer', color: '#f0f0f5',
            }}>
              <Bell size={16} />
              {alertCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4, width: 16, height: 16,
                  borderRadius: '50%', background: '#ef4444', color: '#fff',
                  fontSize: 9, fontWeight: 700, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 20 }} className="vrg-scroll">
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <div style={{ width: 24, height: 24, border: '2px solid rgba(255,153,0,0.2)', borderTopColor: '#FF9900', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          }>
            <PageComponent />
          </Suspense>
        </main>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 767px) {
          .admin-mobile-menu { display: block !important; }
          .admin-collapse-btn { display: none !important; }
          .admin-main-content { margin-left: 0 !important; }
          .admin-toggle-label { display: none !important; }
        }
      `}</style>
    </div>
  )
}
