import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toCamelCase } from '@/lib/supabase-utils'
import { verifyToken, signToken } from '@/lib/vrg-auth'

export async function PUT(req: NextRequest) {
  try {
    const payload = verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const body = await req.json()
    const { name, phone, currentPassword, newPassword } = body

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.id)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
      }
      const valid = await bcrypt.compare(currentPassword, user.password)
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
      }
    }

    if (phone && phone !== user.phone) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .single()
      if (existing) {
        return NextResponse.json({ error: 'Phone already in use' }, { status: 409 })
      }
    }

    const updateData: Record<string, any> = {}
    if (name) updateData.name = name
    if (phone) updateData.phone = phone
    if (newPassword) updateData.password = await bcrypt.hash(newPassword, 12)

    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', payload.id)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)

    const camelUser = toCamelCase(updated)
    const token = signToken(camelUser)
    return NextResponse.json({
      token,
      user: { id: camelUser.id, name: camelUser.name, phone: camelUser.phone, role: camelUser.role, referralCode: camelUser.referralCode },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 })
  }
}
