import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toCamelCase } from '@/lib/supabase-utils'
import { verifyToken, isAdminOrModerator } from '@/lib/vrg-auth'
import { writeLog } from '@/lib/vrg-logs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = verifyToken(req)
    if (!payload || !isAdminOrModerator(payload)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { id } = await params
    const productId = parseInt(id)
    const { data: existing, error: findError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()
    if (findError || !existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const body = await req.json()
    const { stock } = body
    if (stock === undefined || stock < 0) {
      return NextResponse.json({ error: 'Valid stock value is required' }, { status: 400 })
    }

    const { data: product, error } = await supabase
      .from('products')
      .update({ stock })
      .eq('id', productId)
      .select()
      .single()

    if (error) throw new Error(error.message)

    writeLog(payload.id, payload.name, 'update_stock', 'product', productId, existing.name, String(existing.stock), String(stock))

    return NextResponse.json({ product: toCamelCase(product) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
