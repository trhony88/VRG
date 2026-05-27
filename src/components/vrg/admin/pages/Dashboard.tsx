'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, Clock, Package, CheckCircle2, Truck, Users, Eye, RotateCcw } from 'lucide-react'
import { api } from '@/lib/vrg-api'

interface KpiData {
  totalSales: number
  monthSales: number
  daySales: number
  pendingOrders: number
  confirmedOrders: number
  deliveredOrders: number
  totalClients: number
  totalVisits: number
  monthlyData: { month: string; total: number }[]
}

interface StatsResponse {
  total_sales: number
  month_sales: number
  today_sales: number
  total_orders: number
  month_orders: number
  today_orders: number
  pending_orders: number
  confirmed_orders: number
  shipped_orders: number
  total_users: number
  month_users: number
  today_users: number
  low_stock: number
  total_visits: number
  today_visits: number
  monthly_chart: { month: string; sales: number; orders: number }[]
}

function mapStatsToKpi(raw: StatsResponse): KpiData {
  return {
    totalSales: raw.total_sales || 0,
    monthSales: raw.month_sales || 0,
    daySales: raw.today_sales || 0,
    pendingOrders: raw.pending_orders || 0,
    confirmedOrders: raw.confirmed_orders || 0,
    deliveredOrders: raw.shipped_orders || 0,
    totalClients: raw.total_users || 0,
    totalVisits: raw.total_visits || 0,
    monthlyData: (raw.monthly_chart || []).map(m => ({
      month: m.month,
      total: m.sales || 0,
    })),
  }
}

const cardBase: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)', borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.06)', padding: 20,
}

const anim = (i: number) => ({
  initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.4 },
})

export default function Dashboard() {
  const [data, setData] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadDashboard = useCallback(async () => {
    setRefreshing(true)
    try {
      const raw = await api.get<StatsResponse>('/admin/stats')
      setData(mapStatsToKpi(raw))
    } catch {
      setData(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Listen for custom event dispatched from Orders page after confirmation
  useEffect(() => {
    const handler = () => {
      loadDashboard()
    }
    window.addEventListener('admin-data-refresh', handler)
    return () => window.removeEventListener('admin-data-refresh', handler)
  }, [loadDashboard])

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{ ...cardBase, height: 100 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite' }} />
          </div>
        ))}
      </div>
    )
  }

  const d = data || {
    totalSales: 0, monthSales: 0, daySales: 0,
    pendingOrders: 0, confirmedOrders: 0, deliveredOrders: 0,
    totalClients: 0, totalVisits: 0, monthlyData: [],
  }

  const kpis = [
    { label: 'Ventes totales', value: d.totalSales, icon: <DollarSign size={20} />, color: '#FF9900', suffix: ' Ar' },
    { label: 'Ventes du mois', value: d.monthSales, icon: <TrendingUp size={20} />, color: '#34d399', suffix: ' Ar' },
    { label: "Ventes du jour", value: d.daySales, icon: <Clock size={20} />, color: '#60a5fa', suffix: ' Ar' },
  ]

  const statuses = [
    { label: 'En attente', value: d.pendingOrders, icon: <Package size={18} />, color: '#fbbf24' },
    { label: 'Confirmé', value: d.confirmedOrders, icon: <CheckCircle2 size={18} />, color: '#34d399' },
    { label: 'Livré', value: d.deliveredOrders, icon: <Truck size={18} />, color: '#60a5fa' },
  ]

  const maxMonthly = Math.max(...(d.monthlyData || []).map(m => m.total), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header with reset button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f0f0f5' }}>Vue d&apos;ensemble</h3>
        <button
          onClick={loadDashboard}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
            background: refreshing ? 'rgba(255,153,0,0.08)' : 'rgba(255,255,255,0.04)',
            color: refreshing ? '#FF9900' : 'rgba(240,240,245,0.7)',
            fontSize: 13, fontWeight: 500, cursor: refreshing ? 'wait' : 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            if (!refreshing) {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,153,0,0.1)'
              (e.currentTarget as HTMLButtonElement).style.color = '#FF9900'
            }
          }}
          onMouseLeave={e => {
            if (!refreshing) {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,240,245,0.7)'
            }
          }}
        >
          <RotateCcw size={14} style={refreshing ? { animation: 'spin 0.8s linear infinite' } : {}} />
          Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {kpis.map((k, i) => (
          <motion.div key={k.label} {...anim(i)} style={cardBase}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'rgba(240,240,245,0.45)', fontWeight: 500 }}>{k.label}</span>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: `${k.color}15`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: k.color,
              }}>
                {k.icon}
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f5' }}>
              {k.value.toLocaleString('fr-FR')}{k.suffix}
            </div>
          </motion.div>
        ))}

        {statuses.map((s, i) => (
          <motion.div key={s.label} {...anim(i + 3)} style={cardBase}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: `${s.color}15`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: s.color,
              }}>
                {s.icon}
              </div>
              <span style={{ fontSize: 12, color: 'rgba(240,240,245,0.45)' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f5' }}>{s.value}</div>
          </motion.div>
        ))}

        <motion.div {...anim(6)} style={cardBase}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
              <Users size={18} />
            </div>
            <span style={{ fontSize: 12, color: 'rgba(240,240,245,0.45)' }}>Clients</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f5' }}>{d.totalClients}</div>
        </motion.div>

        <motion.div {...anim(7)} style={cardBase}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(96,165,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <Eye size={18} />
            </div>
            <span style={{ fontSize: 12, color: 'rgba(240,240,245,0.45)' }}>Visites</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f5' }}>{d.totalVisits}</div>
        </motion.div>
      </div>

      {/* Monthly Chart */}
      <motion.div {...anim(8)} style={cardBase}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f5', marginBottom: 16 }}>Ventes mensuelles</h3>
        {d.monthlyData && d.monthlyData.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
            {d.monthlyData.map((m, i) => {
              const h = (m.total / maxMonthly) * 140
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: 'rgba(240,240,245,0.4)' }}>
                    {m.total >= 1000000 ? `${(m.total / 1000000).toFixed(1)}M` : m.total >= 1000 ? `${(m.total / 1000).toFixed(0)}K` : m.total}
                  </span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: Math.max(h, 4) }}
                    transition={{ delay: i * 0.04, duration: 0.5, ease: 'easeOut' }}
                    style={{
                      width: '100%', maxWidth: 32, borderRadius: 4,
                      background: i === d.monthlyData.length - 1
                        ? 'linear-gradient(to top, #FF9900, #fbbf24)'
                        : 'rgba(255,153,0,0.2)',
                    }}
                  />
                  <span style={{ fontSize: 10, color: 'rgba(240,240,245,0.35)' }}>{m.month}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>
            Aucune donnée disponible
          </div>
        )}
      </motion.div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
