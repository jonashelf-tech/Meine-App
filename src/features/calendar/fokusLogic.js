// Belegte Slots des Tages als „Heute steht fest" — chronologisch.
export function getFixedEntries(todaySlots = {}) {
  return Object.entries(todaySlots)
    .filter(([, slot]) => slot)
    .map(([slotKey, slot]) => ({ slotKey, slot }))
    .sort((a, b) => parseFloat(a.slotKey) - parseFloat(b.slotKey))
}

// Tag „geschafft": alles Feste + alle freien erledigt, und es gab überhaupt etwas.
export function isDayComplete(fixedEntries, freeTodos) {
  const total = fixedEntries.length + freeTodos.length
  if (total === 0) return false
  const fixedDone = fixedEntries.every(e => e.slot.done)
  const freeDone  = freeTodos.every(t => t.done)
  return fixedDone && freeDone
}
