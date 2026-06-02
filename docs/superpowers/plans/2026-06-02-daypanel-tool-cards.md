# DayPanel Tool-Karten Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DayPanel im Kalender zeigt Tool-Aktivität (Kognitiv, Gewicht, Elvi) als eigenständige Karten im einheitlichen Stil; „Erledigt" enthält nur noch echte abgehakte Todos.

**Architecture:** Alle Änderungen in `DayPanel` (inline-Komponente in TabKalender.jsx). Drei neue Karten-Blöcke nach der Erledigt-Sektion. Hilfs-Funktionen als Modul-Level-Functions direkt über `DayPanel`. Kein neues File nötig.

**Tech Stack:** React 19, CSS Modules, Zustand, localStorage (lv/SK)

---

## Betroffene Dateien

- **Modify:** `src/features/calendar/TabKalender/TabKalender.jsx`
  - Import `getDelta` aus sessionStore
  - Hilfsfunktionen `formatDur`, `fmtScore`, `fmtDelta` hinzufügen
  - `DayPanel`: open-State, doneCount, JSX-Körper
- **Modify:** `src/features/calendar/TabKalender/TabKalender.module.css`
  - Neue Klassen: `.toolCard`, `.toolCardHead`, `.toolCardTitle`, `.toolCardOpenBtn`, `.toolCardBody`, `.cardEntry`, `.cardEntryTop`, `.cardEntryName`, `.cardEntryTime`, `.cardTags`, `.cardTag`, `.gewCardRow`, `.gewVal`, `.gewUnit`, `.gewKcal`, `.elviDoses`, `.elviDosePill`, `.elviRatings`, `.elviRatingTag`, `.elviNotes`

---

## Task 1: Import + State + Kognitiv aus Erledigt entfernen

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

- [ ] **Schritt 1: getDelta zum Import hinzufügen**

  Zeile 7, alt:
  ```js
  import { loadSessions as loadKognitivSessions } from '../../tools/kognitiv/sessionStore'
  ```
  Neu:
  ```js
  import { loadSessions as loadKognitivSessions, getDelta } from '../../tools/kognitiv/sessionStore'
  ```

- [ ] **Schritt 2: Hilfsfunktionen vor DayPanel einfügen**

  Direkt vor `function DayPanel(...)` einfügen:
  ```js
  function formatDur(secs) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}min ${s}s` : `${s}s`
  }

  function fmtScore(sess) {
    const sc = sess.score
    if (!sc) return null
    if (sc.correct  != null) return `${sc.correct} korrekt · ${sc.errors ?? 0} Fehler`
    if (sc.hits     != null) return `${sc.hits} korrekt · ${sc.errors ?? 0} Fehler`
    if (sc.correctRounds != null) return `${sc.correctRounds} Runden korrekt`
    return null
  }

  function fmtDelta(moduleId, delta) {
    if (delta === null) return null
    const cfg  = MODULE_CONFIG[moduleId]
    const unit = cfg?.mainMetricUnit ?? ''
    const lowerIsBetter = ['ms', 's'].includes(unit)
    const improved = lowerIsBetter ? delta > 0 : delta < 0
    return { text: `${improved ? '−' : '+'}${Math.abs(delta)}${unit} vs. vorher`, improved }
  }
  ```

- [ ] **Schritt 3: open-State in DayPanel aktualisieren**

  Zeile 88, alt:
  ```js
  const [open, setOpen] = useState({ zeitplan: true, done: false, gewicht: true })
  ```
  Neu:
  ```js
  const [open, setOpen] = useState({ zeitplan: true, done: false, kognitiv: false, gewicht: false, elvi: false })
  ```

- [ ] **Schritt 4: doneCount korrigieren (Kognitiv raus)**

  Alt (ca. Zeile 99):
  ```js
  const doneCount = doneTodos.length + kognitivSessions.length
  ```
  Neu:
  ```js
  const doneCount = doneTodos.length
  ```

- [ ] **Schritt 5: Elvi-Daten in DayPanel laden**

  Direkt nach `const doneCount = ...` einfügen:
  ```js
  const elviDay = useMemo(() => {
    try {
      const raw = localStorage.getItem('adhs_elvi_v1')
      if (!raw) return null
      return JSON.parse(raw)?.savedDays?.find(d => d.date === dateKey) ?? null
    } catch { return null }
  }, [dateKey])
  ```

- [ ] **Schritt 6: Kognitiv-Block aus Erledigt-Body entfernen**

  Im Erledigt-Body (ab `{open.done && (`): den `kognitivSessions.map(...)`-Block komplett löschen.

  Alt (Ende des Erledigt-Blocks):
  ```jsx
  {kognitivSessions.map(sess => {
    const cfg  = MODULE_CONFIG[sess.moduleId]
    const time = new Date(sess.startedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    return (
      <div
        key={sess.id}
        className={s.dayPanelTodoEntry}
        style={{ borderLeftColor: kognitivColor }}
      >
        <span className={s.dayPanelCheck} style={{ color: kognitivColor }}>✓</span>
        <span className={s.dayPanelEntryText}>
          {cfg?.name ?? sess.moduleId} · {sess.mainMetric}{cfg?.mainMetricUnit}
        </span>
        <span className={s.dayPanelEntryTime} style={{ color: 'var(--text-faint)' }}>{time}</span>
      </div>
    )
  })}
  ```
  → komplett löschen. Das `<>` Fragment-Wrapper drumherum wenn er nur noch `doneTodos.map(...)` enthält auch entfernen — stattdessen direkt:
  ```jsx
  {doneTodos.map(t => (
    <div
      key={t.id}
      className={s.dayPanelTodoEntry}
      style={{ borderLeftColor: t.color || 'var(--primary)' }}
      onClick={() => setRestoreTodo(t)}
    >
      <span className={s.dayPanelCheck}>✓</span>
      <span className={s.dayPanelEntryText}>{t.text}</span>
    </div>
  ))}
  ```

- [ ] **Schritt 7: Dev-Server starten und prüfen**

  ```bash
  npm run dev
  ```
  Kalender → Monat → Tag mit erledigten Todos anklicken → „Erledigt" aufklappen → nur Todos sichtbar, keine Kognitiv-Einträge mehr. Count korrekt.

- [ ] **Schritt 8: Commit**

  ```bash
  git add src/features/calendar/TabKalender/TabKalender.jsx
  git commit -m "fix: remove kognitiv sessions from Erledigt, add getDelta + helpers"
  ```

---

## Task 2: CSS für Tool-Karten

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.module.css`

- [ ] **Schritt 1: Neue Klassen ans Ende der Datei anhängen**

  ```css
  /* ─── Tool-Karten (DayPanel) ──────────────────────────────── */
  .toolCard {
    background: var(--surface);
    border-radius: var(--r);
    margin-bottom: 6px;
    overflow: hidden;
  }

  .toolCardHead {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    cursor: pointer;
  }

  .toolCardTitle {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    flex: 1;
    font-family: var(--font);
  }

  .toolCardArrow {
    font-size: 10px;
    color: var(--text-faint);
  }

  .toolCardOpenBtn {
    font-size: 10px;
    font-weight: 600;
    border: none;
    border-radius: var(--r-sm);
    padding: 3px 8px;
    cursor: pointer;
    white-space: nowrap;
    font-family: var(--font);
  }

  .toolCardBody {
    padding: 0 10px 8px;
  }

  /* Card entries (Kognitiv sessions) */
  .cardEntry {
    padding: 5px 0;
    border-bottom: 1px solid var(--border);
  }

  .cardEntry:last-child {
    border-bottom: none;
  }

  .cardEntryTop {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
  }

  .cardEntryCheck {
    font-size: 11px;
    flex-shrink: 0;
  }

  .cardEntryName {
    font-size: 12px;
    font-weight: 600;
    flex: 1;
    color: var(--text);
  }

  .cardEntryTime {
    font-size: 10px;
    color: var(--text-faint);
  }

  .cardTags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding-left: 17px;
  }

  .cardTag {
    font-size: 10px;
    border-radius: 4px;
    padding: 1px 6px;
    background: rgba(255,255,255,0.07);
    color: var(--text-dim);
  }

  .cardTagPos { color: var(--emerald); }
  .cardTagNeg { color: var(--rose); }

  /* Gewicht card */
  .gewCardRow {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 4px 0 2px;
  }

  .gewVal {
    font-size: 22px;
    font-weight: 700;
  }

  .gewUnit {
    font-size: 12px;
    color: var(--text-dim);
    margin-left: -2px;
  }

  .gewKcal {
    font-size: 13px;
    color: var(--text-dim);
  }

  /* Elvi card */
  .elviDoses {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 6px;
  }

  .elviDosePill {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 99px;
    font-family: var(--font);
  }

  .elviRatings {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .elviRatingTag {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255,255,255,0.07);
    color: var(--text-dim);
  }

  .elviNotes {
    font-size: 11px;
    color: var(--text-dim);
    margin-top: 6px;
    font-style: italic;
    border-left: 2px solid var(--border);
    padding-left: 6px;
  }
  ```

- [ ] **Schritt 2: Commit**

  ```bash
  git add src/features/calendar/TabKalender/TabKalender.module.css
  git commit -m "style: add tool card CSS classes to TabKalender"
  ```

---

## Task 3: Kognitiv-Karte

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

- [ ] **Schritt 1: Kognitiv-Karte nach der Erledigt-Sektion einfügen**

  Direkt nach dem schließenden `</div>` der Erledigt-Sektion (vor der Gewicht-Sektion) einfügen:

  ```jsx
  {/* Kognitiv-Karte */}
  {kognitivSessions.length > 0 && (
    <div
      className={s.toolCard}
      style={{ borderTop: `2px solid ${kognitivColor}` }}
    >
      <div className={s.toolCardHead} onClick={() => toggle('kognitiv')}>
        <span className={s.toolCardTitle} style={{ color: kognitivColor }}>Kognitiv</span>
        <button
          className={s.toolCardOpenBtn}
          style={{ color: kognitivColor, background: `color-mix(in srgb, ${kognitivColor} 15%, transparent)` }}
          onClick={e => { e.stopPropagation(); setCurrentTab(TOOL_TAB.kognitiv) }}
        >
          → Öffnen
        </button>
        <span className={s.toolCardArrow}>{open.kognitiv ? '▾' : '▸'}</span>
      </div>
      {open.kognitiv && (
        <div className={s.toolCardBody}>
          {kognitivSessions.map(sess => {
            const cfg   = MODULE_CONFIG[sess.moduleId]
            const time  = new Date(sess.startedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            const score = fmtScore(sess)
            const delta = fmtDelta(sess.moduleId, getDelta(sess.moduleId, sess.mainMetric))
            return (
              <div key={sess.id} className={s.cardEntry}>
                <div className={s.cardEntryTop}>
                  <span className={s.cardEntryCheck} style={{ color: kognitivColor }}>✓</span>
                  <span className={s.cardEntryName}>{cfg?.name ?? sess.moduleId}</span>
                  <span className={s.cardEntryTime}>{time} · {formatDur(sess.duration)}</span>
                </div>
                <div className={s.cardTags}>
                  <span className={s.cardTag} style={{ background: `color-mix(in srgb, ${kognitivColor} 18%, transparent)`, color: kognitivColor }}>
                    {sess.mainMetric}{cfg?.mainMetricUnit ?? ''}
                  </span>
                  {score && <span className={s.cardTag}>{score}</span>}
                  {delta && (
                    <span className={[s.cardTag, delta.improved ? s.cardTagPos : s.cardTagNeg].join(' ')}>
                      {delta.text}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )}
  ```

- [ ] **Schritt 2: Im Browser prüfen**

  Kalender → Tag mit Kognitiv-Sessions → Karte erscheint (zugeklappt) → aufklappen → Sessions mit Metriken und Delta sichtbar → „→ Öffnen" navigiert zum Kognitiv-Tab.

- [ ] **Schritt 3: Commit**

  ```bash
  git add src/features/calendar/TabKalender/TabKalender.jsx
  git commit -m "feat: add Kognitiv tool card to DayPanel"
  ```

---

## Task 4: Gewicht-Karte (ersetzt alte Gewicht-Sektion)

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

- [ ] **Schritt 1: Alte Gewicht-Sektion ersetzen**

  Die alte Sektion (beginnt mit `{/* Gewicht — nur wenn Eintrag für diesen Tag */}`, endet mit dem schließenden `)}`) komplett durch folgendes ersetzen:

  ```jsx
  {/* Gewicht-Karte */}
  {weightEntry && (
    <div
      className={s.toolCard}
      style={{ borderTop: `2px solid ${getToolColor('gewicht', toolColors)}` }}
    >
      <div className={s.toolCardHead} onClick={() => toggle('gewicht')}>
        <span className={s.toolCardTitle} style={{ color: getToolColor('gewicht', toolColors) }}>Gewicht</span>
        <button
          className={s.toolCardOpenBtn}
          style={{ color: getToolColor('gewicht', toolColors), background: `color-mix(in srgb, ${getToolColor('gewicht', toolColors)} 15%, transparent)` }}
          onClick={e => { e.stopPropagation(); setCurrentTab(TOOL_TAB.gewicht) }}
        >
          → Öffnen
        </button>
        <span className={s.toolCardArrow}>{open.gewicht ? '▾' : '▸'}</span>
      </div>
      {open.gewicht && (
        <div className={s.toolCardBody}>
          <div className={s.gewCardRow}>
            <span className={s.gewVal} style={{ color: getToolColor('gewicht', toolColors) }}>
              {weightEntry.kg}
            </span>
            <span className={s.gewUnit}>kg</span>
            {weightEntry.kcal && (
              <span className={s.gewKcal}>{weightEntry.kcal.toLocaleString('de-DE')} kcal</span>
            )}
          </div>
        </div>
      )}
    </div>
  )}
  ```

- [ ] **Schritt 2: Im Browser prüfen**

  Tag mit Gewichtseintrag → Gewicht-Karte erscheint (zugeklappt) → aufklappen → kg und ggf. kcal sichtbar → „→ Öffnen" navigiert zu Gewicht-Tab. Alte `.dayPanelGewicht*`-Klassen werden nicht mehr verwendet (können in einem späteren Cleanup-Pass aus der CSS entfernt werden).

- [ ] **Schritt 3: Commit**

  ```bash
  git add src/features/calendar/TabKalender/TabKalender.jsx
  git commit -m "feat: replace Gewicht section with card-style in DayPanel"
  ```

---

## Task 5: Elvi-Karte

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

- [ ] **Schritt 1: Elvi-Karte nach Gewicht-Karte einfügen**

  Direkt nach der Gewicht-Karte (vor dem Restore-Modal-Block):

  ```jsx
  {/* Elvi-Karte */}
  {elviDay && (
    <div
      className={s.toolCard}
      style={{ borderTop: `2px solid ${getToolColor('elvi', toolColors)}` }}
    >
      <div className={s.toolCardHead} onClick={() => toggle('elvi')}>
        <span className={s.toolCardTitle} style={{ color: getToolColor('elvi', toolColors) }}>Elvi</span>
        <button
          className={s.toolCardOpenBtn}
          style={{ color: getToolColor('elvi', toolColors), background: `color-mix(in srgb, ${getToolColor('elvi', toolColors)} 15%, transparent)` }}
          onClick={e => { e.stopPropagation(); setCurrentTab(TOOL_TAB.elvi) }}
        >
          → Öffnen
        </button>
        <span className={s.toolCardArrow}>{open.elvi ? '▾' : '▸'}</span>
      </div>
      {open.elvi && (
        <div className={s.toolCardBody}>
          {elviDay.doses?.length > 0 && (
            <div className={s.elviDoses}>
              {elviDay.doses.map((d, i) => (
                <span
                  key={i}
                  className={s.elviDosePill}
                  style={{
                    color: getToolColor('elvi', toolColors),
                    background: `color-mix(in srgb, ${getToolColor('elvi', toolColors)} 18%, transparent)`,
                  }}
                >
                  {d.mg}mg · {d.time}
                </span>
              ))}
            </div>
          )}
          {elviDay.ratings && (
            <div className={s.elviRatings}>
              {[
                { key: 'fokus',    label: 'Fokus'    },
                { key: 'stimmung', label: 'Stimmung' },
                { key: 'crash',    label: 'Crash'    },
                { key: 'impulse',  label: 'Impuls'   },
              ]
                .filter(r => elviDay.ratings[r.key] != null)
                .map(r => (
                  <span key={r.key} className={s.elviRatingTag}>
                    {r.label} {elviDay.ratings[r.key]}/10
                  </span>
                ))
              }
            </div>
          )}
          {elviDay.notes?.trim() && (
            <div className={s.elviNotes}>{elviDay.notes.trim()}</div>
          )}
        </div>
      )}
    </div>
  )}
  ```

- [ ] **Schritt 2: Im Browser prüfen**

  Tag mit gespeichertem Elvi-Tag → Karte erscheint → aufklappen → Dosen, Ratings, ggf. Notizen sichtbar → „→ Öffnen" navigiert zu Elvi-Tab.

- [ ] **Schritt 3: Gesamtbild prüfen**

  Tag mit allen drei Tool-Einträgen aufrufen (Demo-Daten ggf. manuell eintragen). Reihenfolge: Zeitplan → Erledigt → Kognitiv → Gewicht → Elvi. Alle zugeklappt beim Öffnen. Jede Karte unabhängig aufklappbar.

- [ ] **Schritt 4: Commit**

  ```bash
  git add src/features/calendar/TabKalender/TabKalender.jsx
  git commit -m "feat: add Elvi tool card to DayPanel"
  ```

---

## Spec-Abdeckung

| Spec-Anforderung | Task |
|---|---|
| Erledigt: nur abgehakte Todos | Task 1 |
| Kognitiv aus Erledigt entfernen | Task 1 |
| Karten: default zugeklappt | Task 1 (open-State), Tasks 3–5 |
| CSS-Vorlage für Tool-Karten | Task 2 |
| Kognitiv-Karte mit Sessions, Metriken, Delta, Link | Task 3 |
| Gewicht-Karte (ersetzt alte Sektion) | Task 4 |
| Elvi-Karte mit Dosen, Ratings, Notes, Link | Task 5 |
| Reihenfolge: Zeitplan → Erledigt → Kognitiv → Gewicht → Elvi | Tasks 3–5 |
