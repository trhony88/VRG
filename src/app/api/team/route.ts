import { NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toCamelCase } from '@/lib/supabase-utils'

export async function GET() {
  try {
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json([])
    }

    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('active', true)
      .order('order_index', { ascending: true })

    if (error) throw new Error(error.message)

    return NextResponse.json(toCamelCase(data || []))
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
