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

    const { searchParams } = new URL(req.url)
    const since = searchParams.get('since')
    const roomId = parseInt(searchParams.get('roomId') || '0')

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 })
    }

    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (since) {
      query = query.gte('created_at', new Date(parseInt(since)).toISOString())
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json(toCamelCase(data || []))
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
