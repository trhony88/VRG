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
      return NextResponse.json([])
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const action = searchParams.get('action')

    let query = supabase
      .from('admin_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (action) {
      query = query.eq('action', action)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    return NextResponse.json(toCamelCase(data || []))
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
