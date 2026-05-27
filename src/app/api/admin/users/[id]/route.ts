import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toCamelCase } from '@/lib/supabase-utils'
import { verifyToken, isAdmin } from '@/lib/vrg-auth'
import { writeLog } from '@/lib/vrg-logs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = verifyToken(req)
    if (!payload || !isAdmin(payload)) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { id } = await params
    const userId = parseInt(id)
    const { data: existing, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (findError || !existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const { role } = body
    if (!role || !['client', 'admin', 'moderator'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select('id, name, phone, role')
      .single()

    if (error) throw new Error(error.message)

    writeLog(payload.id, payload.name, 'update_role', 'user', userId, existing.name, existing.role, role)

    return NextResponse.json({ user: toCamelCase(user) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
