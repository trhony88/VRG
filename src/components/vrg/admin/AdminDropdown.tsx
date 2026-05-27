'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export interface DropOption {
  label: string
  value: string
  color?: string
  icon?: React.ReactNode
}

interface AdminDropdownProps {
  trigger?: React.ReactNode
  options: DropOption[]
  value?: string
  onChange?: (val: string) => void
  compact?: boolean
  placeholder?: string
  footer?: React.ReactNode
  width?: number
  align?: 'left' | 'right'
}

export default function AdminDropdown({
  trigger, options, value, onChange, compact, placeholder = 'Sélectionner',
  footer, width = 180, align = 'left',
}: AdminDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const selected = options.find(o => o.value === value)

  const calcPos = useCallback(() => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({
      top: r.bottom + 6,
      left: align === 'left' ? r.left : r.right - width,
    })
  }, [align, width])

  useEffect(() => {
    if (open) calcPos()
    const onResize = () => calcPos()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, calcPos])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const dropdown = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            width, zIndex: 9999, padding: 4,
            background: '#141428', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          }}
        >
          {options.map(opt => (
            <button key={opt.value}
              onClick={() => { onChange?.(opt.value); setOpen(false) }}
              style={{
                width: '100%', padding: '8px 10px', border: 'none', background: 'none',
                borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 8, color: opt.value === value ? '#FF9900' : '#f0f0f5',
                background: opt.value === value ? 'rgba(255,153,0,0.1)' : 'transparent',
                fontSize: 13, textAlign: 'left', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (opt.value !== value) (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (opt.value !== value) (e.target as HTMLButtonElement).style.background = 'transparent' }}
            >
              {opt.icon}
              <span style={{ flex: 1 }}>{opt.label}</span>
              {opt.color && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color }} />
              )}
            </button>
          ))}
          {footer && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 4, paddingTop: 4 }}>
              {footer}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Compact mode: colored badge
  if (compact && selected) {
    return (
      <>
        <div ref={ref} style={{ display: 'inline-block' }}>
          <button onClick={() => setOpen(!open)}
            style={{
              padding: '4px 10px', borderRadius: 20, border: 'none',
              background: `${selected.color || '#FF9900'}22`,
              color: selected.color || '#FF9900',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              transition: 'opacity 0.15s',
            }}>
            {selected.label}
            <ChevronDown size={12} />
          </button>
        </div>
        {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
      </>
    )
  }

  // Custom trigger mode
  if (trigger) {
    return (
      <>
        <div ref={ref} style={{ display: 'inline-block' }}>
          {React.cloneElement(trigger as React.ReactElement<any>, { onClick: () => setOpen(!open) })}
        </div>
        {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
      </>
    )
  }

  // Default select-style button
  return (
    <>
      <div ref={ref} style={{ display: 'inline-block', width }}>
        <button onClick={() => setOpen(!open)}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: selected ? '#f0f0f5' : 'rgba(240,240,245,0.4)',
            fontSize: 13, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
          <span>{selected?.label || placeholder}</span>
          <ChevronDown size={14} color="rgba(240,240,245,0.35)" />
        </button>
      </div>
      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </>
  )
}
