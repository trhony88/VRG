import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { verifyToken, isAdminOrModerator } from '@/lib/vrg-auth'

export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(req)
    if (!payload || !isAdminOrModerator(payload)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({
        total_sales: 0,
        month_sales: 0,
        today_sales: 0,
        total_orders: 0,
        month_orders: 0,
        today_orders: 0,
        pending_orders: 0,
        confirmed_orders: 0,
        shipped_orders: 0,
        total_users: 0,
        month_users: 0,
        today_users: 0,
        low_stock: 0,
        total_visits: 0,
        today_visits: 0,
        monthly_chart: [],
      })
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Total sales
    const { data: allOrders, error: allErr } = await supabase
      .from('orders')
      .select('total')
    if (allErr) throw new Error(allErr.message)
    const totalSales = (allOrders || []).reduce((s, o) => s + (o.total || 0), 0)

    // Month sales
    const { data: monthOrders, error: monthErr } = await supabase
      .from('orders')
      .select('total')
      .gte('created_at', monthStart.toISOString())
    if (monthErr) throw new Error(monthErr.message)
    const monthSales = (monthOrders || []).reduce((s, o) => s + (o.total || 0), 0)

    // Today sales
    const { data: todayOrders, error: todayErr } = await supabase
      .from('orders')
      .select('total')
      .gte('created_at', todayStart.toISOString())
    if (todayErr) throw new Error(todayErr.message)
    const todaySales = (todayOrders || []).reduce((s, o) => s + (o.total || 0), 0)

    // Order counts
    const { count: totalOrdersCount, error: tcErr } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
    if (tcErr) throw new Error(tcErr.message)

    const { count: monthOrdersCount, error: mcErr } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString())
    if (mcErr) throw new Error(mcErr.message)

    const { count: todayOrdersCount, error: tdcErr } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
    if (tdcErr) throw new Error(tdcErr.message)

    // Status counts
    const { count: pendingOrders, error: peErr } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    if (peErr) throw new Error(peErr.message)

    const { count: confirmedOrders, error: coErr } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')
    if (coErr) throw new Error(coErr.message)

    const { count: shippedOrders, error: seErr } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'delivered')
    if (seErr) throw new Error(seErr.message)

    // User counts
    const { count: totalUsers, error: tuErr } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    if (tuErr) throw new Error(tuErr.message)

    const { count: monthUsers, error: muErr } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString())
    if (muErr) throw new Error(muErr.message)

    const { count: todayUsers, error: tduErr } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
    if (tduErr) throw new Error(tduErr.message)

    // Low stock
    const { count: lowStock, error: lsErr } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lte('stock', 5)
      .eq('active', true)
    if (lsErr) throw new Error(lsErr.message)

    // Visits
    let totalVisits = 0
    let todayVisits = 0
    try {
      const { data: visits } = await supabase
        .from('visits')
        .select('*')
        .order('date', { ascending: false })
        .limit(30)
      totalVisits = (visits || []).reduce((sum: number, v: any) => sum + (v.count || 0), 0)
      const todayStr = now.toISOString().split('T')[0]
      const todayVisit = (visits || []).find((v: any) => v.date === todayStr)
      todayVisits = todayVisit?.count || 0
    } catch {
      // visits table may not exist
    }

    // Monthly chart data - last 6 months
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      const label = d.toLocaleString('default', { month: 'short' })
      const { data: mOrders, error: mErr } = await supabase
        .from('orders')
        .select('total')
        .gte('created_at', d.toISOString())
        .lte('created_at', dEnd.toISOString())
      if (mErr) throw new Error(mErr.message)
      monthlyData.push({
        month: label,
        sales: (mOrders || []).reduce((s, o) => s + (o.total || 0), 0),
        orders: (mOrders || []).length,
      })
    }

    return NextResponse.json({
      total_sales: totalSales,
      month_sales: monthSales,
      today_sales: todaySales,
      total_orders: totalOrdersCount || 0,
      month_orders: monthOrdersCount || 0,
      today_orders: todayOrdersCount || 0,
      pending_orders: pendingOrders || 0,
      confirmed_orders: confirmedOrders || 0,
      shipped_orders: shippedOrders || 0,
      total_users: totalUsers || 0,
      month_users: monthUsers || 0,
      today_users: todayUsers || 0,
      low_stock: lowStock || 0,
      total_visits: totalVisits,
      today_visits: todayVisits,
      monthly_chart: monthlyData,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
