import { NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toCamelCase } from '@/lib/supabase-utils'

export async function GET() {
  try {
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json([])
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .gt('stock', 0)
      .order('category', { ascending: true })
      .order('id', { ascending: true })

    if (error) throw new Error(error.message)

    const result = (data || []).map((p: any) => ({
      ...p,
      images: (() => {
        if (!p.images) return []
        if (Array.isArray(p.images)) return p.images
        try { return JSON.parse(p.images) } catch { return [] }
      })(),
    }))

    return NextResponse.json(toCamelCase(result))
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch products' }, { status: 500 })
  }
}
