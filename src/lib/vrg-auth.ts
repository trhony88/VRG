import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'change_this'

export function verifyToken(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth) return null
  const token = auth.split(' ')[1]
  try { return jwt.verify(token, SECRET) as any }
  catch { return null }
}

export function signToken(user: any) {
  return jwt.sign(
    { id: user.id, name: user.name, phone: user.phone, role: user.role, referralCode: user.referralCode },
    SECRET,
    { expiresIn: '30d' }
  )
}

export function isAdminOrModerator(payload: any): boolean {
  return payload && (payload.role === 'admin' || payload.role === 'moderator')
}

export function isAdmin(payload: any): boolean {
  return payload && payload.role === 'admin'
}
