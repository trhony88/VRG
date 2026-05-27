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
    const orderId = parseInt(id)
    const { data: existing, error: findError } = await supabase
      .from('orders')
      .select('*, user:users(id, name, phone)')
      .eq('id', orderId)
      .single()
    if (findError || !existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const body = await req.json()
    const { status, payment_confirmed } = body

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (payment_confirmed !== undefined) updateData.payment_confirmed = payment_confirmed

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*, items:order_items(*), user:users(id, name, phone)')
      .single()

    if (error) throw new Error(error.message)

    const changes: string[] = []
    if (status !== undefined && status !== existing.status) changes.push(`status: ${existing.status} → ${status}`)
    if (payment_confirmed !== undefined && payment_confirmed !== existing.payment_confirmed) changes.push(`payment_confirmed: ${existing.payment_confirmed} → ${payment_confirmed}`)

    writeLog(
      payload.id,
      payload.name,
      'update',
      'order',
      orderId,
      `#${orderId}`,
      changes.join(', ') || null,
      null
    )

    return NextResponse.json({ order: toCamelCase(order) })
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
    const orderId = parseInt(id)

    // Verify order exists
    const { data: existing, error: findError } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .single()
    if (findError || !existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Delete order items first, then the order (CASCADE should handle this, but be safe)
    const { error: itemsErr } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId)
    if (itemsErr) throw new Error(itemsErr.message)

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
    if (error) throw new Error(error.message)

    writeLog(
      payload.id,
      payload.name,
      'delete',
      'order',
      orderId,
      `#${orderId}`,
      'Commande supprimée',
      null
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
