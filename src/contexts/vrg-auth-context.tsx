'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/vrg-api'

interface User {
  id: number
  name: string
  phone: string
  role?: string
}

interface OrderItem {
  id?: number
  name: string
  qty: number
  price: number
}

interface Order {
  id: number
  items: OrderItem[]
  total: number
  status: string
  createdAt: string
  payment: string
  address: string
  zone?: string
  hours?: string
  deliveryFee?: number
}

interface AuthContextType {
  user: User | null
  orders: Order[]
  loading: boolean
  register: (data: { name: string; phone: string; password: string; referralCode?: string }) => Promise<void>
  login: (data: { phone: string; password: string }) => Promise<User>
  logout: () => void
  updateProfile: (data: { name?: string; phone?: string; currentPassword?: string; newPassword?: string }) => Promise<void>
  addOrder: (order: any) => Promise<Order>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within VrgAuthProvider')
  return ctx
}

export function VrgAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const loadOrders = useCallback(async () => {
    try {
      const data = await api.get<Order[]>('/orders')
      setOrders(data)
    } catch {
      setOrders([])
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('vrg_token') : null
      if (!token) { if (!cancelled) setLoading(false); return }

      try {
        const { user } = await api.get<{ user: User }>('/auth/me')
        if (!cancelled) { setUser(user); await loadOrders() }
      } catch {
        if (!cancelled) { api.clearToken(); setUser(null) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [loadOrders])

  const register = async ({ name, phone, password, referralCode }: { name: string; phone: string; password: string; referralCode?: string }) => {
    const res = await api.post<{ token: string; user: User }>('/auth/register', { name, phone, password, referralCode })
    if (res.token) api.setToken(res.token)
    if (typeof window !== 'undefined') sessionStorage.removeItem('vrg_ref')
    setUser(res.user)
    await loadOrders()
  }

  const login = async ({ phone, password }: { phone: string; password: string }): Promise<User> => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { phone, password })
    if (res.token) api.setToken(res.token)
    setUser(res.user)
    await loadOrders()
    return res.user
  }

  const logout = () => {
    api.clearToken()
    setUser(null)
    setOrders([])
  }

  const updateProfile = async ({ name, phone, currentPassword, newPassword }: { name?: string; phone?: string; currentPassword?: string; newPassword?: string }) => {
    const data = await api.put<{ user: User }>('/auth/profile', { name, phone, currentPassword, newPassword })
    setUser(data.user)
  }

  const addOrder = async (order: any): Promise<Order> => {
    const res = await api.post<{ order: Order }>('/orders', order)
    const newOrder = res.order || res
    await loadOrders()
    return newOrder
  }

  return (
    <AuthContext.Provider value={{ user, orders, loading, register, login, logout, addOrder, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
