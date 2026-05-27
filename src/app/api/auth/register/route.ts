import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toCamelCase } from '@/lib/supabase-utils'
import { signToken } from '@/lib/vrg-auth'

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const body = await req.json()
    const { name, phone, password, referralCode } = body

    if (!name || !phone || !password) {
      return NextResponse.json({ error: 'Name, phone, and password are required' }, { status: 400 })
    }
    if (phone.length < 10) {
      return NextResponse.json({ error: 'Phone must be at least 10 characters' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Phone already registered' }, { status: 409 })
    }

    let referrerId: number | null = null
    if (referralCode) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referralCode)
        .single()
      if (referrer) referrerId = referrer.id
    }

    const hashed = await bcrypt.hash(password, 12)
    const code = generateReferralCode()

    const { data: user, error: createError } = await supabase
      .from('users')
      .insert({
        name,
        phone,
        password: hashed,
        referral_code: code,
        referred_by: referrerId,
        role: 'client',
      })
      .select()
      .single()

    if (createError) throw new Error(createError.message)

    if (referrerId && user) {
      await supabase.from('referrals').insert({
        referrer_id: referrerId,
        referred_id: user.id,
      })
    }

    const camelUser = toCamelCase(user)
    const token = signToken(camelUser)
    return NextResponse.json({
      token,
      user: { id: camelUser.id, name: camelUser.name, phone: camelUser.phone, role: camelUser.role, referralCode: camelUser.referralCode },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 })
  }
}
