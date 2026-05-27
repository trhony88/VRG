import { NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export async function GET() {
  try {
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({})
    }

    const { data, error } = await supabase.from('settings').select('*')

    if (error) throw new Error(error.message)

    const obj: Record<string, string | null> = {}
    for (const s of data || []) obj[s.key] = s.value
    return NextResponse.json(obj)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
