import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toCamelCase } from '@/lib/supabase-utils'
import { verifyToken, isAdminOrModerator } from '@/lib/vrg-auth'
import { writeLog } from '@/lib/vrg-logs'

export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(req)
    if (!payload || !isAdminOrModerator(payload)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json([])
    }

    const { data, error } = await supabase.from('settings').select('*')
    if (error) throw new Error(error.message)

    return NextResponse.json(toCamelCase(data || []))
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const payload = verifyToken(req)
    if (!payload || !isAdminOrModerator(payload)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const body = await req.json()
    const { settings } = body

    if (!Array.isArray(settings)) {
      return NextResponse.json({ error: 'Settings must be an array' }, { status: 400 })
    }

    const rows = settings.map((s: any) => ({
      key: s.key,
      value: s.value,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('settings')
      .upsert(rows, { onConflict: 'key' })

    if (error) throw new Error(error.message)

    writeLog(payload.id, payload.name, 'update', 'setting', 0, 'settings', null, `${settings.length} settings updated`)

    const { data: allSettings, error: fetchError } = await supabase.from('settings').select('*')
    if (fetchError) throw new Error(fetchError.message)

    return NextResponse.json({ settings: toCamelCase(allSettings || []) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
