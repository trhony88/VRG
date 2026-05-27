import { supabase } from '@/lib/supabase'

export async function writeLog(
  adminId: number,
  adminName: string,
  action: string,
  targetType: string,
  targetId: number,
  targetName: string,
  oldValue: string | null,
  newValue: string | null
) {
  try {
    await supabase.from('admin_logs').insert({
      admin_id: adminId,
      admin_name: adminName,
      action,
      target_type: targetType,
      target_id: targetId,
      target_name: targetName,
      old_value: oldValue,
      new_value: newValue,
    })
  } catch {}
}
