'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Archive, Pencil, X, Save } from 'lucide-react'
import { api } from '@/lib/vrg-api'
import { getCatColor } from '@/lib/vrg-cat-colors'

interface Product {
  id: number; name: string; category: string; price: number
  stock: number; image: string; archived: boolean; description?: string
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [cats, setCats] = useState<string[]>([])
  const [modal, setModal] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.get<Product[]>('/admin/products').then(data => {
      if (!cancelled) {
        setProducts(data || [])
        const allCats = [...new Set((data || []).map((p: Product) => p.category).filter(Boolean))]
        setCats(allCats.sort())
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = products.filter(p =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase())) &&
    (!catFilter || p.category === catFilter) &&
    !p.archived
  )

  const handleSave = async (product: Partial<Product>) => {
    if (product.id) {
      await api.put(`/admin/products/${product.id}`, product)
    } else {
      await api.post('/admin/products', product)
    }
    setModal(null)
    // Reload
    const data = await api.get<Product[]>('/admin/products')
    setProducts(data || [])
  }

  const handleArchive = async (id: number) => {
    await api.put(`/admin/products/${id}`, { archived: true })
    setProducts(prev => prev.map(p => p.id === id ? { ...p, archived: true } : p))
  }

  const tableHead: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'rgba(240,240,245,0.4)',
    textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 12px',
    textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)',
  }

  const tableCell: React.CSSProperties = {
    padding: '10px 12px', fontSize: 13, color: '#f0f0f5',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} color="rgba(240,240,245,0.35)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un article..."
            style={{
              width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#f0f0f5', fontSize: 13, outline: 'none',
            }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', color: '#f0f0f5', fontSize: 13,
            cursor: 'pointer', outline: 'none',
          }}>
          <option value="">Toutes catégories</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <motion.button onClick={() => setModal({ id: 0, name: '', category: '', price: 0, stock: 0, image: '', archived: false })}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: '#FF9900', color: '#fff', fontSize: 13,
            fontWeight: 600, cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: 6,
          }}>
          <Plus size={15} /> Ajouter
        </motion.button>
      </div>

      {/* Table */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)', overflow: 'auto',
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>Aucun article trouvé</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHead}>Article</th>
                <th style={tableHead}>Catégorie</th>
                <th style={tableHead}>Prix</th>
                <th style={tableHead}>Stock</th>
                <th style={{ ...tableHead, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const cc = getCatColor(p.category)
                return (
                  <tr key={p.id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                    <td style={tableCell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.image ? (
                          <img src={p.image} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'rgba(240,240,245,0.3)' }}>IMG</div>
                        )}
                        <span style={{ fontWeight: 500 }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={tableCell}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        color: cc.color, background: cc.bg, border: `1px solid ${cc.border}`,
                      }}>
                        {p.category || '—'}
                      </span>
                    </td>
                    <td style={tableCell}>{p.price.toLocaleString('fr-FR')} Ar</td>
                    <td style={tableCell}>
                      <span style={{
                        color: p.stock === 0 ? '#ef4444' : p.stock <= 5 ? '#fbbf24' : '#34d399',
                        fontWeight: 600,
                      }}>
                        {p.stock}
                      </span>
                    </td>
                    <td style={{ ...tableCell, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => setModal(p)} title="Modifier"
                          style={{ width: 30, height: 30, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.05)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleArchive(p.id)} title="Archiver"
                          style={{ width: 30, height: 30, borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Archive size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Product Modal */}
      <AnimatePresence>
        {modal && (
          <ProductModal product={modal} onSave={handleSave} onClose={() => setModal(null)} categories={cats} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Product Modal ─── */
function ProductModal({ product, onSave, onClose, categories }: {
  product: Partial<Product>; onSave: (p: Partial<Product>) => void; onClose: () => void; categories: string[]
}) {
  const [form, setForm] = useState({
    name: product.name || '', category: product.category || '',
    price: product.price || 0, stock: product.stock || 0,
    image: product.image || '', description: product.description || '',
  })
  const [saving, setSaving] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f0f0f5', fontSize: 13, outline: 'none',
  }

  const handleSave = async () => {
    setSaving(true)
    try { await onSave({ ...product, ...form }) } catch {}
    setSaving(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440, padding: 24,
          background: '#0c0c1a', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f0f0f5' }}>
            {product.id ? 'Modifier l\'article' : 'Nouvel article'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(240,240,245,0.4)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input style={inputStyle} placeholder="Nom du produit" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <div style={{ display: 'flex', gap: 10 }}>
            <select style={{ ...inputStyle, flex: 1 }} value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">Catégorie</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="Nouvelle catégorie"
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="Prix (Ar)" value={form.price}
              onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
            <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="Stock" value={form.stock}
              onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
          </div>
          <input style={inputStyle} placeholder="URL de l'image" value={form.image}
            onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Description"
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#f0f0f5', fontSize: 13, cursor: 'pointer' }}>
              Annuler
            </button>
            <motion.button onClick={handleSave} disabled={saving || !form.name}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#FF9900', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving || !form.name ? 'not-allowed' : 'pointer', opacity: !form.name ? 0.5 : 1 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Save size={14} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
              </span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
