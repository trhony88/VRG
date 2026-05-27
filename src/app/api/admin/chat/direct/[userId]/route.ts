import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toCamelCase } from '@/lib/supabase-utils'
import { verifyToken, isAdminOrModerator } from '@/lib/vrg-auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const payload = verifyToken(req)
    if (!payload || !isAdminOrModerator(payload)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { userId: targetUserId } = await params
    const targetId = parseInt(targetUserId)

    const { data: targetUser, error: tErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', targetId)
      .single()
    if (tErr || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if a direct room already exists between these two users
    // Get rooms where I am a member
    const { data: myMemberships, error: mmErr } = await supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('user_id', payload.id)
    if (mmErr) throw new Error(mmErr.message)

    const myRoomIds = (myMemberships || []).map((m: any) => m.room_id)

    if (myRoomIds.length > 0) {
      // Get rooms where target user is also a member
      const { data: targetMemberships, error: tmErr } = await supabase
        .from('chat_room_members')
        .select('room_id')
        .eq('user_id', targetId)
        .in('room_id', myRoomIds)
      if (tmErr) throw new Error(tmErr.message)

      const commonRoomIds = (targetMemberships || []).map((m: any) => m.room_id)

      if (commonRoomIds.length > 0) {
        // Check if any of these are direct rooms
        const { data: existingRooms, error: erErr } = await supabase
          .from('chat_rooms')
          .select('*')
          .in('id', commonRoomIds)
          .eq('type', 'direct')
          .limit(1)
        if (erErr) throw new Error(erErr.message)

        if (existingRooms && existingRooms.length > 0) {
          const existing = existingRooms[0]
          const { data: messages, error: msgErr } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('room_id', existing.id)
            .order('created_at', { ascending: true })
          if (msgErr) throw new Error(msgErr.message)

          return NextResponse.json({ room: toCamelCase(existing), messages: toCamelCase(messages || []) })
        }
      }
    }

    // Create new direct room
    const { data: room, error: roomErr } = await supabase
      .from('chat_rooms')
      .insert({ type: 'direct' })
      .select()
      .single()
    if (roomErr) throw new Error(roomErr.error || roomErr.message)

    // Add both members
    const { error: membersErr } = await supabase
      .from('chat_room_members')
      .insert([
        { room_id: room.id, user_id: payload.id },
        { room_id: room.id, user_id: targetId },
      ])
    if (membersErr) throw new Error(membersErr.message)

    return NextResponse.json({ room: toCamelCase(room), messages: [] }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
