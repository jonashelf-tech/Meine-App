import { dateKey } from '../../utils'

// Natürliche Eingabe → Todo-Felder. Einzige Parser-Quelle der App
// (konsolidiert aus TodoModal.parseTodoText + dem alten QuickAdd.parseInput).
//
// Erkennt:
//   !text / !!text                  → Priorität 1
//   dringend/wichtig/asap/sofort    → Priorität 1 · sollte/bald → Priorität 2
//   #Kategorie                      → category
//   15-17 / 15:00-17:30 (uhr)       → time + duration
//   14:30 / 14.30 uhr / 14 uhr      → time
//   heute/morgen/übermorgen/Montag… → date
//   24.12. / 24.12.26 / 24.12.2026  → date
//   30min / 1,5h / 2 std            → duration
export function parseTodoText(raw) {
  let text = raw.trim()
  let date = null, time = null, duration = null, priority = 3, category = null
  const today = new Date()

  // "!" / "!!" am Anfang → Prio 1
  if (/^!!?/.test(text)) {
    priority = 1
    text = text.replace(/^!!?/, '').trimStart()
  }

  // #Kategorie
  const catMatch = text.match(/(?:^|\s)#(\S+)/)
  if (catMatch) {
    category = catMatch[1]
    text = text.replace(catMatch[0], ' ')
  }

  if (/\b(dringend|wichtig|asap|sofort|urgent)\b/i.test(text)) priority = 1
  else if (priority === 3 && /\b(sollte|bald|soon)\b/i.test(text)) priority = 2
  text = text.replace(/\b(dringend|wichtig|asap|sofort|urgent|sollte|bald|soon)\b/gi, '')

  const tr = text.match(/\b(\d{1,2})(?::(\d{2}))?-(\d{1,2})(?::(\d{2}))?(?:\s*uhr)?(?=\s|$)/i)
  if (tr) {
    const h1 = parseInt(tr[1]), m1 = tr[2] ? parseInt(tr[2]) : 0
    const h2 = parseInt(tr[3]), m2 = tr[4] ? parseInt(tr[4]) : 0
    if (h1 >= 0 && h1 <= 23 && m1 >= 0 && m1 <= 59 &&
        h2 >= 0 && h2 <= 23 && m2 >= 0 && m2 <= 59 &&
        (h2 * 60 + m2) > (h1 * 60 + m1)) {
      time     = `${String(h1).padStart(2,'0')}:${String(m1).padStart(2,'0')}`
      duration = (h2 * 60 + m2) - (h1 * 60 + m1)
      text = text.replace(tr[0], '')
    }
  }

  if (/\bmorgen\b/i.test(text)) { const d = new Date(today); d.setDate(d.getDate()+1); date = dateKey(d) }
  else if (/\bübermorgen\b/i.test(text)) { const d = new Date(today); d.setDate(d.getDate()+2); date = dateKey(d) }
  else if (/\bheute\b/i.test(text)) { date = dateKey(today) }

  const WD = ['sonntag','montag','dienstag','mittwoch','donnerstag','freitag','samstag']
  WD.forEach((w, i) => {
    if (new RegExp('\\b'+w+'\\b','i').test(text)) {
      const d = new Date(today); const diff = (i - d.getDay() + 7) % 7 || 7
      d.setDate(d.getDate() + diff); date = dateKey(d)
    }
  })

  const dm = text.match(/(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/)
  if (dm) {
    let year = dm[3] ? parseInt(dm[3]) : today.getFullYear()
    if (year < 100) year += 2000
    const d = new Date(year, parseInt(dm[2])-1, parseInt(dm[1]))
    date = dateKey(d)
  }

  text = text.replace(/\b(morgen|übermorgen|heute|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/gi, '')
  text = text.replace(/\d{1,2}\.\d{1,2}\.?(?:\d{2,4})?/g, '')

  if (!time) {
    const tm = text.match(/(\d{1,2})[:.](\d{2})\s*(?:uhr)?/i) || text.match(/(\d{1,2})\s*uhr/i)
    if (tm) {
      const h = parseInt(tm[1]), m = tm[2] ? parseInt(tm[2]) : 0
      time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
      text = text.replace(tm[0], '')
    }
  }

  if (!duration) {
    const dr = text.match(/(\d+(?:[.,]\d+)?)\s*(h|std|stunden?|min|minuten?)/i)
    if (dr) {
      const v = parseFloat(dr[1].replace(',','.')); const u = dr[2].toLowerCase()
      duration = u.startsWith('h') || u.startsWith('s') ? Math.round(v*60) : Math.round(v)
      text = text.replace(dr[0], '')
    }
  }

  return { text: text.trim().replace(/\s+/g, ' '), date, time, duration, priority, category }
}
