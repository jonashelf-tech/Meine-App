// ─── Buddy-API-Client ─────────────────────────────────────
// Dünner fetch-Wrapper auf POST /buddy des eigenen Workers. Auth über die
// bestehenden Cloud-Zugangsdaten (Token = Rate-Limit-Anker, Konzept §10.4).
// Fehler kommen als deutsche, im Sheet direkt zeigbare Sätze zurück.
import { loadCloudCreds, isCloudActive } from '../../sync/cloudBackup'
import { validateAction } from './buddyActions'

const TIMEOUT_MS = 45000

export const buddyAvailable = () => isCloudActive()

export class BuddyError extends Error {
  constructor(art, userMessage) {
    super(userMessage)
    this.art = art
    this.userMessage = userMessage
  }
}

const STATUS_MESSAGES = {
  401: ['konto',  'Dein Cloud-Zugang passt nicht mehr — schau einmal in Einstellungen → Cloud-Sicherung.'],
  429: ['limit',  'Mein Kontingent für heute ist aufgebraucht — morgen bin ich wieder da.'],
  503: ['server', 'Ich bin auf dem Server noch nicht freigeschaltet (server/README.md → „Buddy aktivieren").'],
  502: ['ki',     'Der KI-Dienst ist gerade nicht erreichbar — versuch es gleich nochmal.'],
}

export async function askBuddy({ kind, message = null, context, profile, history = [] }) {
  const creds = loadCloudCreds()
  if (!creds?.serverUrl || !creds?.token)
    throw new BuddyError('konto', 'Ich brauche die Cloud-Sicherung als Zugang (Einstellungen → Cloud-Sicherung).')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  let res
  try {
    res = await fetch(`${creds.serverUrl}/buddy`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${creds.token}` },
      body: JSON.stringify({ kind, message, context, profile, history }),
      signal: ctrl.signal,
    })
  } catch {
    throw new BuddyError('offline', 'Ich komme gerade nicht ins Netz — probier es gleich nochmal.')
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}))
      if (data.scope === 'monthly')
        throw new BuddyError('limit', 'Das gemeinsame Monats-Budget ist aufgebraucht — der Deckel schützt die Kosten.')
    }
    const [art, msg] = STATUS_MESSAGES[res.status] ?? ['unbekannt', 'Da ist etwas schiefgegangen — versuch es gleich nochmal.']
    throw new BuddyError(art, msg)
  }

  const data = await res.json().catch(() => null)
  if (!data) throw new BuddyError('ki', 'Die Antwort kam kaputt an — versuch es nochmal.')
  return {
    text: typeof data.text === 'string' ? data.text : '',
    // KI-Antwort = Fremd-Input: nur streng validierte Actions erreichen die UI
    actions: (Array.isArray(data.actions) ? data.actions : []).map(validateAction).filter(Boolean),
  }
}
