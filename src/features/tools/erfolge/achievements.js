// ─── Achievement-Definitionen ─────────────────────────────
// target: Zielwert für Progress-Anzeige
// condition(stats): true wenn freigeschaltet

export const ACHIEVEMENTS = [
  // ── Tagesplaner ──────────────────────────────────────────
  { id: 'planer_1',   category: 'planer', name: 'Erster Tag',       target: 1,   points: 15,   condition: s => s.tagesplanerTage >= 1   },
  { id: 'planer_5',   category: 'planer', name: 'Dabei geblieben',  target: 5,   points: 35,   condition: s => s.tagesplanerTage >= 5   },
  { id: 'planer_10',  category: 'planer', name: 'Im Rhythmus',      target: 10,  points: 75,   condition: s => s.tagesplanerTage >= 10  },
  { id: 'planer_15',  category: 'planer', name: 'Gewohnheit',       target: 15,  points: 110,  condition: s => s.tagesplanerTage >= 15  },
  { id: 'planer_20',  category: 'planer', name: 'Solide',           target: 20,  points: 150,  condition: s => s.tagesplanerTage >= 20  },
  { id: 'planer_25',  category: 'planer', name: 'Verlässlich',      target: 25,  points: 200,  condition: s => s.tagesplanerTage >= 25  },
  { id: 'planer_50',  category: 'planer', name: 'Starke Basis',     target: 50,  points: 350,  condition: s => s.tagesplanerTage >= 50  },
  { id: 'planer_75',  category: 'planer', name: 'Meister-Rhythmus', target: 75,  points: 500,  condition: s => s.tagesplanerTage >= 75  },
  { id: 'planer_100', category: 'planer', name: 'Hundert Tage',     target: 100, points: 700,  condition: s => s.tagesplanerTage >= 100 },
  { id: 'planer_150', category: 'planer', name: 'Legende',          target: 150, points: 1000, condition: s => s.tagesplanerTage >= 150 },

  // ── Todos erledigt ────────────────────────────────────────
  { id: 'todo_1',   category: 'todos', name: 'Erster Schritt', target: 1,   points: 15,   condition: s => s.todosErledigt >= 1   },
  { id: 'todo_5',   category: 'todos', name: 'Momentum',       target: 5,   points: 35,   condition: s => s.todosErledigt >= 5   },
  { id: 'todo_10',  category: 'todos', name: 'In Fahrt',       target: 10,  points: 75,   condition: s => s.todosErledigt >= 10  },
  { id: 'todo_15',  category: 'todos', name: 'Läuft',          target: 15,  points: 110,  condition: s => s.todosErledigt >= 15  },
  { id: 'todo_20',  category: 'todos', name: 'Fokussiert',     target: 20,  points: 150,  condition: s => s.todosErledigt >= 20  },
  { id: 'todo_25',  category: 'todos', name: 'Auf Kurs',       target: 25,  points: 200,  condition: s => s.todosErledigt >= 25  },
  { id: 'todo_50',  category: 'todos', name: 'Fünfzig',        target: 50,  points: 350,  condition: s => s.todosErledigt >= 50  },
  { id: 'todo_75',  category: 'todos', name: 'Stark',          target: 75,  points: 500,  condition: s => s.todosErledigt >= 75  },
  { id: 'todo_100', category: 'todos', name: 'Hundert',        target: 100, points: 700,  condition: s => s.todosErledigt >= 100 },
  { id: 'todo_150', category: 'todos', name: 'Unaufhaltbar',   target: 150, points: 1000, condition: s => s.todosErledigt >= 150 },
  { id: 'todo_200', category: 'todos', name: 'Zweihundert',    target: 200, points: 1300, condition: s => s.todosErledigt >= 200 },
  { id: 'todo_250', category: 'todos', name: 'Legende',        target: 250, points: 1600, condition: s => s.todosErledigt >= 250 },
]

// ─── Hilfsfunktionen ─────────────────────────────────────

/** Stats aus App-Daten berechnen */
export function getErfolgeStats(todos, tracking) {
  return {
    todosErledigt:   todos.filter(t => t.done).length,
    tagesplanerTage: (tracking.tagesplanerDates || []).length,
  }
}

/** Aktueller Stat-Wert für ein Achievement (für Progress-Bar) */
export function getStatValue(achievement, stats) {
  return achievement.category === 'planer' ? stats.tagesplanerTage : stats.todosErledigt
}

/** Freigeschaltete aber noch nicht geclaimte Achievements — höchste Punkte zuerst */
export function getUnlocked(stats, claimedIds) {
  return ACHIEVEMENTS
    .filter(a => a.condition(stats) && !claimedIds.includes(a.id))
    .sort((a, b) => b.points - a.points)
}

/** Gibt true zurück wenn heute noch Claims möglich (max 5/Tag) */
export function canClaimToday(claimedDates, today) {
  return (claimedDates[today] || []).length < 5
}

/** Wie viele Claims heute noch möglich */
export function remainingClaimsToday(claimedDates, today) {
  return Math.max(0, 5 - (claimedDates[today] || []).length)
}

/** Leerer Erfolge-State als Fallback */
export const EMPTY_ERFOLGE = { claimedIds: [], claimedDates: {}, totalPoints: 0 }
