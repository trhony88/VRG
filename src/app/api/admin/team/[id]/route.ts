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
    const memberId = parseInt(id)
    const { data: existing, error: findError } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .single()
    if (findError || !existing) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    const body = await req.json()
    const { name, role, description, photo, orderIndex, active } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (description !== undefined) updateData.description = description
    if (photo !== undefined) updateData.photo = photo
    if (orderIndex !== undefined) updateData.order_index = orderIndex
    if (active !== undefined) updateData.active = active

    const { data: member, error } = await supabase
      .from('team_members')
      .update(updateData)
      .eq('id', memberId)
      .select()
      .single()

    if (error) throw new Error(error.message)

    writeLog(payload.id, payload.name, 'update', 'team', memberId, existing.name, JSON.stringify(existing), JSON.stringify(member))

    return NextResponse.json({ member: toCamelCase(member) })
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
    const memberId = parseInt(id)
    const { data: existing, error: findError } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .single()
    if (findError || !existing) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('team_members')
      .update({ active: false })
      .eq('id', memberId)

    if (error) throw new Error(error.message)

    writeLog(payload.id, payload.name, 'delete', 'team', memberId, existing.name, null, existing.name)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
