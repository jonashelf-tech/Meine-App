import { lv, sv, SK } from '../../storage'
import { todayKey } from '../../utils'

// Dachboden-Regel: Tools tracken ihr letztes Öffnen (Tages-Genauigkeit).
// Ab UNUSED_DAYS ohne Öffnen zeigt „Meine Tools" ein Badge mit
// 1-Tap-Deaktivieren — nichts passiert automatisch, Daten bleiben immer.
export const UNUSED_DAYS = 60

export function markToolUsed(toolId, today = todayKey()) {
  const usage = lv(SK.toolUsage, {})
  if (usage[toolId] === today) return
  sv(SK.toolUsage, { ...usage, [toolId]: today })
}

// Aktive Tools ohne Eintrag bekommen „heute" als Beobachtungsstart —
// sonst würde ein vor dem Tracking aktiviertes Tool sofort als ungenutzt gelten.
export function seedToolUsage(activeToolIds, today = todayKey()) {
  const usage = lv(SK.toolUsage, {})
  const missing = activeToolIds.filter(id => !usage[id])
  if (missing.length === 0) return
  const next = { ...usage }
  missing.forEach(id => { next[id] = today })
  sv(SK.toolUsage, next)
}

export function unusedDays(toolId, now = Date.now()) {
  const last = lv(SK.toolUsage, {})[toolId]
  if (!last) return 0
  const [y, m, d] = last.split('-').map(Number)
  return Math.floor((now - new Date(y, m - 1, d).getTime()) / 86400000)
}
