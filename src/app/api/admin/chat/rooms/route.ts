import { NextRequest, NextResponse } from 'next/server'
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
      return NextResponse.json({ rooms: [] })
    }

    // Get rooms where user is a member
    const { data: myMemberships, error: memErr } = await supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('user_id', payload.id)
    if (memErr) throw new Error(memErr.message)

    const myRoomIds = (myMemberships || []).map((m: any) => m.room_id)

    // Build query for rooms
    let query = supabase
      .from('chat_rooms')
      .select('*')
      .order('created_at', { ascending: false })

    // Include admin system rooms + user's rooms
    const typesToQuery = ['admin_only', 'admin_mod']
    if (myRoomIds.length > 0) {
      const { data: rooms, error: roomsErr } = await query.or(
        `type.eq.admin_only,type.eq.admin_mod,id.in.(${myRoomIds.join(',')})`
      )
      if (roomsErr) throw new Error(roomsErr.message)

      // Get members for these rooms
      const roomIds = (rooms || []).map((r: any) => r.id)
      let membersMap: Record<number, any[]> = {}
      let clientsMap: Record<number, any> = {}

      if (roomIds.length > 0) {
        // Get all members with user info
        const { data: allMembers } = await supabase
          .from('chat_room_members')
          .select('*, user:users(id, name, phone)')
          .in('room_id', roomIds)
        membersMap = {}
        for (const m of allMembers || []) {
          if (!membersMap[m.room_id]) membersMap[m.room_id] = []
          membersMap[m.room_id].push(m)
        }

        // Get message counts per room
        const { data: msgCounts } = await supabase
          .from('chat_messages')
          .select('room_id')
        const countMap: Record<number, number> = {}
        for (const m of msgCounts || []) {
          countMap[m.room_id] = (countMap[m.room_id] || 0) + 1
        }

        // Get client info for rooms that have client_id
        const clientIds = [...new Set((rooms || []).filter((r: any) => r.client_id).map((r: any) => r.client_id))]
        if (clientIds.length > 0) {
          const { data: clients } = await supabase
            .from('users')
            .select('id, name')
            .in('id', clientIds)
          for (const c of clients || []) {
            clientsMap[c.id] = { id: c.id, name: c.name }
          }
        }

        const result = (rooms || []).map((r: any) => ({
          ...r,
          members: (membersMap[r.id] || []).map((m: any) => ({
            userId: m.user_id,
            user: m.user,
          })),
          client: r.client_id ? clientsMap[r.client_id] || null : null,
          _count: { messages: countMap[r.id] || 0 },
        }))

        return NextResponse.json({ rooms: toCamelCase(result) })
      }

      return NextResponse.json({ rooms: [] })
    }

    // No memberships yet, just get admin system rooms
    const { data: sysRooms, error: sysErr } = query.in('type', typesToQuery)
    if (sysErr) throw new Error(sysErr.message)

    return NextResponse.json({ rooms: toCamelCase(sysRooms || []) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
