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
    const { name, description, price, category, stock, images } = body

    const oldName = existing.name
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = price
    if (category !== undefined) updateData.category = category
    if (stock !== undefined) updateData.stock = stock
    if (images !== undefined) updateData.images = images ? JSON.stringify(images) : null

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single()

    if (error) throw new Error(error.message)

    writeLog(payload.id, payload.name, 'update', 'product', productId, oldName, JSON.stringify(existing), JSON.stringify(product))

    const result = { ...product, images: product.images ? JSON.parse(product.images) : [] }
    return NextResponse.json({ product: toCamelCase(result) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { error } = await supabase
      .from('products')
      .update({ active: false })
      .eq('id', productId)

    if (error) throw new Error(error.message)

    writeLog(payload.id, payload.name, 'delete', 'product', productId, existing.name, null, existing.name)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
