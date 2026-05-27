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
      return NextResponse.json({ room_id: null, messages: [] })
    }

    // Find existing support room for this user
    const { data: existingRoom, error: findErr } = await supabase
      .from('chat_rooms')
      .select('*, members:chat_room_members(user_id)')
      .eq('type', 'support')
      .eq('client_id', payload.id)
      .limit(1)
      .maybeSingle()

    let room = existingRoom

    if (!room) {
      // Find all staff members to add to the room
      const { data: staff, error: staffErr } = await supabase
        .from('users')
        .select('id')
        .in('role', ['admin', 'moderator'])
      if (staffErr) throw new Error(staffErr.message)

      // Create room first
      const { data: newRoom, error: createErr } = await supabase
        .from('chat_rooms')
        .insert({ type: 'support', client_id: payload.id })
        .select('*, members:chat_room_members(user_id)')
        .single()
      if (createErr) throw new Error(createErr.message)

      // Add members
      const members = [
        { room_id: newRoom.id, user_id: payload.id },
        ...(staff || []).map((s: any) => ({ room_id: newRoom.id, user_id: s.id })),
      ]
      const { error: membersErr } = await supabase
        .from('chat_room_members')
        .insert(members)
      if (membersErr) throw new Error(membersErr.message)

      room = newRoom
    }

    const { data: messages, error: msgErr } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true })
    if (msgErr) throw new Error(msgErr.message)

    return NextResponse.json({ room: toCamelCase(room), messages: toCamelCase(messages || []) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
