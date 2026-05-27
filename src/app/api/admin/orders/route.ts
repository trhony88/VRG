import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toCamelCase } from '@/lib/supabase-utils'
import { verifyToken, isAdminOrModerator } from '@/lib/vrg-auth'
import { writeLog } from '@/lib/vrg-logs'

export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(req)
    if (!payload || !isAdminOrModerator(payload)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json([])
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')

    let query = supabase
      .from('orders')
      .select('*, user:users(id, name, phone), items:order_items(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    return NextResponse.json(toCamelCase(data || []))
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const payload = verifyToken(req)
    if (!payload || !isAdminOrModerator(payload)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // Get all cancelled order IDs
    const { data: cancelledOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'cancelled')

    if (fetchError) throw new Error(fetchError.message)

    if (!cancelledOrders || cancelledOrders.length === 0) {
      return NextResponse.json({ deleted: 0 })
    }

    const orderIds = cancelledOrders.map(o => o.id)

    // Delete order items first
    const { error: itemsErr } = await supabase
      .from('order_items')
      .delete()
      .in('order_id', orderIds)
    if (itemsErr) throw new Error(itemsErr.message)

    // Delete the orders
    const { error, count } = await supabase
      .from('orders')
      .delete()
      .in('id', orderIds)
    if (error) throw new Error(error.message)

    writeLog(
      payload.id,
      payload.name,
      'delete',
      'order',
      0,
      `${orderIds.length} commandes annulées`,
      `IDs: ${orderIds.join(', ')}`,
      null
    )

    return NextResponse.json({ deleted: count || orderIds.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
