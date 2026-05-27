import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toCamelCase } from '@/lib/supabase-utils'
import { signToken } from '@/lib/vrg-auth'

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const body = await req.json()
    const { identifier, phone, password } = body

    // Support both 'identifier' (phone or name) and legacy 'phone' field
    const loginId = identifier || phone

    if (!loginId || !password) {
      return NextResponse.json({ error: 'Identifiant et mot de passe requis' }, { status: 400 })
    }

    // Try to find user by phone OR name
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .or(`phone.eq.${loginId},name.eq.${loginId}`)
      .limit(1)

    const user = users && users.length > 0 ? users[0] : null

    if (error || !user) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const camelUser = toCamelCase(user)
    const token = signToken(camelUser)
    return NextResponse.json({
      token,
      user: { id: camelUser.id, name: camelUser.name, phone: camelUser.phone, role: camelUser.role, referralCode: camelUser.referralCode },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 })
  }
}
