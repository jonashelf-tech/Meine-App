/**
 * kiBridge.js — Textbrücke für KI-gestützte Todo-Zerlegung
 * Keine Netzwerk-Abhängigkeit; rein/testbar.
 */

/**
 * Baut den deutschen Zerlegungs-Prompt.
 * Leere Kontextzeilen (kein hindernis, kein wert) werden weggelassen.
 */
export function buildZerlegenPrompt(todo, { hindernis, wert, today }, projects = []) {
  const lines = []
  lines.push('Du hilfst mir (ich habe ADHS), eine Aufgabe in kleine, konkrete Schritte zu zerlegen.')
  lines.push('')

  let aufgabeLine = `Aufgabe: «${todo.text}»`
  const projektName = todo.projectId ? projects.find(p => p.id === todo.projectId)?.name : null
  if (projektName) aufgabeLine += ` · Projekt: ${projektName}`
  if (todo.duration)  aufgabeLine += ` · ~${todo.duration} min`
  lines.push(aufgabeLine)

  if (hindernis?.trim()) lines.push(`Was mich blockiert: «${hindernis.trim()}»`)
  if (wert?.trim())      lines.push(`Was besser wird: «${wert.trim()}»`)

  if (todo.subItems?.length) {
    const existing = todo.subItems.map(si => si.text).join('; ')
    lines.push(`Bereits vorhandene Schritte: ${existing}`)
  }

  lines.push('')
  lines.push('So gehst du vor:')
  lines.push('- Fehlt dir etwas Wichtiges? Stell mir ZUERST kurze Rückfragen und warte auf meine Antwort.')
  lines.push('- Sonst zerlege direkt: etwa 3–7 kleine Schritte, jeder in einem Sitzen machbar, auf Deutsch.')
  lines.push('- Der erste Schritt soll in ~2 Minuten machbar sein — ein leichter Einstieg.')
  lines.push('- Ein Schritt darf auch sein, eine Info/Nummer kurz nachzuschlagen.')
  lines.push('')
  lines.push('Wenn die Schritte feststehen, gib sie als ALLERLETZTES so aus — nur dieser Block, kein Text danach:')
  lines.push('<<<SCHRITTE')
  lines.push('["erster kleiner Schritt", "zweiter Schritt", "dritter Schritt"]')
  lines.push('SCHRITTE>>>')
  lines.push('')
  lines.push(`Heute: ${today}`)

  return lines.join('\n')
}

/**
 * Versucht tolerant ein JSON-Array aus dem Rohtext zu extrahieren.
 * Reihenfolge: SCHRITTE-Block → ```json-Fence → erstes [...].
 * Gibt das Array zurück oder null bei Fehlschlag. Wirft nie.
 */
export function extractJsonArray(rawText) {
  if (typeof rawText !== 'string') return null

  // 1. SCHRITTE-Block
  const blockMatch = rawText.match(/<<<SCHRITTE\s*([\s\S]*?)\s*SCHRITTE>>>/)
  if (blockMatch) {
    try {
      const parsed = JSON.parse(blockMatch[1].trim())
      if (Array.isArray(parsed)) return parsed
    } catch { /* weiter */ }
  }

  // 2. ```json-Fence
  const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim())
      if (Array.isArray(parsed)) return parsed
    } catch { /* weiter */ }
  }

  // 3. Erstes [...] im Text
  const arrayMatch = rawText.match(/\[[\s\S]*?\]/)
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0])
      if (Array.isArray(parsed)) return parsed
    } catch { /* weiter */ }
  }

  return null
}

/**
 * Parst den Roh-Text und gibt gereinigte Schritte zurück.
 * Akzeptiert String-Arrays oder Objekt-Arrays mit .text.
 * Caps: max 20 Schritte, je max 200 Zeichen.
 */
export function parseZerlegenResult(rawText) {
  const arr = extractJsonArray(rawText)
  if (!arr) {
    return {
      steps: [],
      error: 'Keinen Schritte-Block gefunden — kommt die Antwort komplett mit?',
    }
  }

  const steps = arr
    .map(item => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object' && typeof item.text === 'string') return item.text.trim()
      return ''
    })
    .filter(Boolean)
    .slice(0, 20)
    .map(s => s.slice(0, 200))

  if (steps.length === 0) {
    return {
      steps: [],
      error: 'Das Array war leer — bitte prüf die KI-Antwort.',
    }
  }

  return { steps, error: null }
}
