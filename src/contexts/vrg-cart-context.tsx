'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface CartItem {
  id: string | number
  name: string
  price: number
  qty: number
  image: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: CartItem) => void
  removeItem: (id: string | number) => void
  updateQty: (id: string | number, qty: number) => void
  clearCart: () => void
  total: number
  count: number
}

const CartContext = createContext<CartContextType | null>(null)

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within VrgCartProvider')
  return ctx
}

export function VrgCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  // Load from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(() => {
      try {
        const saved = localStorage.getItem('vrg_cart')
        return saved ? JSON.parse(saved) : []
      } catch { return [] }
    })
  }, [])

  const save = (newItems: CartItem[]) => {
    setItems(newItems)
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('vrg_cart', JSON.stringify(newItems)) } catch { /* ignore */ }
    }
  }

  const addItem = (product: CartItem) => {
    const existing = items.find(i => i.id === product.id)
    if (existing) {
      save(items.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i))
    } else {
      save([...items, { ...product, qty: 1 }])
    }
  }

  const removeItem = (id: string | number) => save(items.filter(i => i.id !== id))

  const updateQty = (id: string | number, qty: number) => {
    if (qty < 1) { removeItem(id); return }
    save(items.map(i => i.id === id ? { ...i, qty } : i))
  }

  const clearCart = () => save([])

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const count = items.reduce((sum, i) => sum + i.qty, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  )
}
