// Pure Advance-Prädikate für das Onboarding. Bekommen einen flachen Store-Snapshot,
// geben true zurück, wenn der zugehörige Schritt als erledigt gilt.
// Zustandslos — der Controller entscheidet daraus „warten" vs. „Weiter-Button".

// Ein echtes Pool-Todo: offen, ohne Datum/Zeit (kein Termin, keine Fälligkeit).
export function hasPoolTodo(ctx) {
  return (ctx.todos ?? []).some(t => !t.done && !t.date && !t.time)
}

// Mindestens ein belegter Slot am gegebenen Tag.
export function hasSlotToday(ctx, todayKey) {
  const day = (ctx.days ?? {})[todayKey]
  return !!day && Object.keys(day).length > 0
}
