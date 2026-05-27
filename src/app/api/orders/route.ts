import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toCamelCase } from '@/lib/supabase-utils'
import { verifyToken } from '@/lib/vrg-auth'

export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json([])
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('user_id', payload.id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json(toCamelCase(orders || []))
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', payload.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role === 'admin' || user.role === 'moderator') {
      return NextResponse.json({ error: 'Staff cannot place orders' }, { status: 403 })
    }

    const body = await req.json()
    const { payment, address, zone, delivery_fee, hours, note, total, transfer, items } = body

    if (!payment || !address || !items || !Array.isArray(items) || !items.length || !total) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    for (const item of items) {
      if (!item.productId || !item.qty || !item.price) {
        return NextResponse.json({ error: 'Each item must have productId, qty, and price' }, { status: 400 })
      }
    }

    // Check stock for all items first
    for (const item of items) {
      const { data: product, error: pError } = await supabase
        .from('products')
        .select('id, name, stock')
        .eq('id', item.productId)
        .single()

      if (pError || !product) {
        return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 400 })
      }
      if (product.stock < item.qty) {
        return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 })
      }
    }

    // Decrement stock for each item
    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.productId)
        .single()

      if (product) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: product.stock - item.qty })
          .eq('id', item.productId)
        if (updateError) throw new Error(updateError.message)
      }
    }

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: payload.id,
        payment,
        address,
        zone: zone || null,
        delivery_fee: delivery_fee || 0,
        hours: hours || null,
        note: note || null,
        total,
        transfer_phone: transfer?.phone || null,
        transfer_name: transfer?.name || null,
        transfer_id: transfer?.id || null,
      })
      .select()
      .single()

    if (orderError) throw new Error(orderError.message)

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      name: item.name,
      qty: item.qty,
      price: item.price,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw new Error(itemsError.message)

    // Fetch the complete order with items for response
    const { data: completeOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', order.id)
      .single()

    if (fetchError) throw new Error(fetchError.message)

    return NextResponse.json({ order: toCamelCase(completeOrder) }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 })
  }
}
