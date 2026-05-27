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

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('stock', { ascending: true })
      .order('id', { ascending: true })

    if (error) throw new Error(error.message)

    return NextResponse.json(
      toCamelCase((data || []).map((p: any) => ({ ...p, images: p.images ? JSON.parse(p.images) : [] })))
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
