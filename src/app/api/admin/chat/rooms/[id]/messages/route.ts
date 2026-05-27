import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toCamelCase } from '@/lib/supabase-utils'
import { verifyToken, isAdminOrModerator } from '@/lib/vrg-auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = verifyToken(req)
    if (!payload || !isAdminOrModerator(payload)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ messages: [] })
    }

    const { id } = await params
    const roomId = parseInt(id)

    const { searchParams } = new URL(req.url)
    const since = searchParams.get('since')

    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (since) {
      query = query.gte('created_at', new Date(since).toISOString())
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({ messages: toCamelCase(data || []) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = verifyToken(req)
    if (!payload || !isAdminOrModerator(payload)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { id } = await params
    const roomId = parseInt(id)
    const body = await req.json()
    const { body: message } = body

    if (!message) {
      return NextResponse.json({ error: 'Message body is required' }, { status: 400 })
    }

    const { data: msg, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: payload.id,
        sender_name: payload.name,
        body: message,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ message: toCamelCase(msg) }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
