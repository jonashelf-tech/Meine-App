import { loadHaushalt, daysSince, freqToDays } from '../haushalt/haushaltData'

// Tage seit ISO-Timestamp (createdAt)
function daysSinceCreated(isoString) {
  if (!isoString) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 86_400_000))
}

function haushaltUrgency(task) {
  const since = daysSince(task.lastDone)
  if (since < 0) return 0
  return since / freqToDays(task)
}

// Baut eine priorisierte Liste von max. 3 Aufgaben.
// Quellen: Pool-Todos + überfällige Haushalt-Tasks.
// Filter: duration ≤ zeitBudget (null = egal), done = false, keine Termine.
// Score: Alter × Prio-Faktor — Haushalt-Tasks kriegen +2 Bonus für Überfälligkeit.
export function buildWasJetzt(todos, zeitBudget, projects = []) {
  const candidates = []

  // ── Pool-Todos ────────────────────────────────────────────
  for (const todo of todos) {
    if (todo.done) continue
    if (todo.date || todo.time) continue                               // keine Termine/Fälligkeiten
    if (todo.duration != null && todo.duration > zeitBudget) continue // passt nicht rein

    const ageDays    = daysSinceCreated(todo.createdAt)
    const prioFactor = todo.priority === 1 ? 3 : todo.priority === 2 ? 1.5 : 1
    const score      = (ageDays / 7) * prioFactor
    const projektName = todo.projectId ? projects.find(p => p.id === todo.projectId)?.name : null

    candidates.push({
      type:     'todo',
      id:       todo.id,
      taskId:   null,
      text:     todo.text,
      duration: todo.duration,
      color:    todo.color ?? 'var(--primary)',
      meta:     todo.priority === 1 ? 'Prio 1' : (projektName ?? 'Todo'),
      score,
    })
  }

  // ── Überfällige Haushalt-Tasks ────────────────────────────
  try {
    const haushaltConfig = loadHaushalt()
    for (const room of haushaltConfig.rooms) {
      for (const task of room.tasks) {
        if (task.duration != null && task.duration > zeitBudget) continue
        const urgency = haushaltUrgency(task)
        if (urgency < 1.0) continue    // nur wirklich überfällige

        candidates.push({
          type:     'haushalt',
          id:       `haus-${task.id}`,
          taskId:   task.id,
          text:     task.text,
          duration: task.duration,
          color:    '#fb7185',          // rot = überfällig
          meta:     room.name,
          score:    urgency * 2,        // Haushalt-Bonus
        })
      }
    }
  } catch {
    // kein Haushalt-Tool konfiguriert → ignorieren
  }

  // Sortieren — gleicher Score → zufällig shuffeln
  candidates.sort((a, b) => {
    const diff = b.score - a.score
    return Math.abs(diff) < 0.01 ? Math.random() - 0.5 : diff
  })

  return candidates.slice(0, 3)
}
