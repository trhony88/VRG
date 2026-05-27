import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toCamelCase } from '@/lib/supabase-utils'
import { verifyToken, isAdminOrModerator } from '@/lib/vrg-auth'

export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(req)
    if (!payload || !isAdminOrModerator(payload)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json([])
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, phone, role, referral_code, created_at')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    // Get order counts per user
    const { data: orderCounts, error: countError } = await supabase
      .from('orders')
      .select('user_id')

    if (countError) throw new Error(countError.message)

    const countMap: Record<string, number> = {}
    for (const o of orderCounts || []) {
      countMap[o.user_id] = (countMap[o.user_id] || 0) + 1
    }

    const result = (users || []).map((u: any) => ({
      ...u,
      orderCount: countMap[u.id] || 0,
    }))

    return NextResponse.json(toCamelCase(result))
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = verifyToken(req)
    if (!payload || !isAdminOrModerator(payload)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const body = await req.json()
    const { name, phone, password, role } = body

    if (!name || !phone || !password || !role) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (role !== 'admin' && role !== 'moderator') {
      return NextResponse.json({ error: 'Role must be admin or moderator' }, { status: 400 })
    }

    const { data: existing, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single()

    if (findError && findError.code !== 'PGRST116') throw new Error(findError.message)
    if (existing) {
      return NextResponse.json({ error: 'Phone already registered' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const { data: user, error } = await supabase
      .from('users')
      .insert({ name, phone, password: hashed, role })
      .select('id, name, phone, role')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ user: toCamelCase(user) }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
