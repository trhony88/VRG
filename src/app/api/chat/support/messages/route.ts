import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toCamelCase } from '@/lib/supabase-utils'
import { verifyToken } from '@/lib/vrg-auth'

export async function POST(req: NextRequest) {
  try {
    const payload = verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const body = await req.json()
    const { body: message, roomId } = body

    if (!message || !roomId) {
      return NextResponse.json({ error: 'Message and roomId are required' }, { status: 400 })
    }

    // Verify user is a member of this room
    const { data: membership, error: memErr } = await supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('user_id', payload.id)
      .limit(1)
      .maybeSingle()

    if (memErr) throw new Error(memErr.message)
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 })
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
