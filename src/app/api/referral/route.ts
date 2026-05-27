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
      return NextResponse.json({ code: '', count: 0, points: 0, referrals: [] })
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('referral_code')
      .eq('id', payload.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get referrals with referred user info
    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('id, referred_id, created_at, referred:users!referred_id(id, name, phone, created_at)')
      .eq('referrer_id', payload.id)
      .order('created_at', { ascending: false })

    if (refError) throw new Error(refError.message)

    const camelReferrals = toCamelCase(referrals || []) as any[]

    return NextResponse.json({
      referralCode: user.referral_code,
      count: camelReferrals.length,
      points: camelReferrals.length * 10,
      referrals: camelReferrals.map((r: any) => ({
        id: r.referred?.id,
        name: r.referred?.name,
        phone: r.referred?.phone,
        createdAt: r.referred?.createdAt,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch referrals' }, { status: 500 })
  }
}
