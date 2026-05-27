import { NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export async function POST() {
  try {
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ ok: true })
    }

    const today = new Date().toISOString().split('T')[0]

    const { data: existing } = await supabase
      .from('visits')
      .select('count')
      .eq('date', today)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('visits')
        .update({ count: existing.count + 1 })
        .eq('date', today)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase
        .from('visits')
        .insert({ date: today, count: 1 })
      if (error) throw new Error(error.message)
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
