# ① Overlay-Primitive & Dialog-Vereinheitlichung — Design

**Datum:** 2026-06-16
**Teil von:** „Nächster Block" (Themen A·B·C·E) → Teilprojekt **①  Fundament/Primitives**
**Folgt:** ② Pro-Oberfläche-Rollout (Standard auf alle Tabs/Tools)

---

## Ziel

Eine geteilte `<Overlay>`-Komponente, die alle echten Dialoge (Backdrop + Karte) identisch
rahmt: **ein** Backdrop, **ein** z-index, **ein** Auftritts-Gefühl, plus Verhalten das heute
fehlt (Escape-zum-Schließen, `role="dialog"`). Jeder Dialog behält nur noch seinen Inhalt.

Dazu zwei bewusst **leichte** Mikro-Animationen, damit sich die App lebendig statt generisch
anfühlt — ohne in Animations-Spielerei zu kippen.

**Woran man Erfolg erkennt:** Jeder Dialog öffnet/schließt gleich & sanft; ein Backdrop-Wert,
ein z-index-Token; pro Dialog-Datei ist kein eigener Backdrop und kein eigener Entrance-Keyframe
mehr nötig; Escape schließt jeden Dialog; Tests grün; visuell verifiziert.

---

## Scope

### Drin — echte „Backdrop + Karte"-Dialoge

**center** (mittig):
| Dialog | Datei | Heute |
|---|---|---|
| TodoModal | `src/components/TodoModal/` | rgba .62 · blur18 · scaleIn · z400 · Keyboard-Offset |
| KlaerenModal | `src/features/tools/klaeren/` | rgba .70 · blur18 · scaleIn · z400 · `--tool-color` am Inhalt |
| MissedReviewModal | `src/features/calendar/Zeitplan/` | rgba .72 · ohne Blur · slideUp+fadeIn · z200 · max-440 |
| RemoveDialog (inline) | `src/features/calendar/Zeitplan/Zeitplan.jsx` | rgba .62 · blur18 · ohne Entrance · z300 · max-320 |
| UpdatePrompt | `src/components/UpdatePrompt/` | rgba .72 · blur4 · z300 |
| Konfigurator-SaveDialog | `src/features/tools/rezepte/Konfigurator.module.css` (`.saveDialogOverlay`) | rgba .60 · ohne Blur · z200 |

**sheet** (unten angedockt):
| Dialog | Datei | Heute |
|---|---|---|
| SlotSheet | `src/features/calendar/Zeitplan/` | rgba .55 · ohne Blur · slideInBottom · z200 |
| BirthdaySheet | `src/features/tools/geburtstage/` | rgba .55 · ohne Blur · slideInBottom · z200 · overlayStyle |
| CheckinModal | `src/features/tools/kognitiv/` | rgba .72 · blur4 · **ohne Entrance** · z200 (`.backdrop`) |
| BlockerModal | `src/features/calendar/Blocker/` | rgba .62 · blur18 · slideUp · z400 · Keyboard-Offset |
| RepeatDeleteSheet | `src/features/calendar/Blocker/` | rgba .62 · blur18 · slideUp · z400 |

→ 11 Dialoge. Migration in zwei Wellen (Welle 1 = die 9 Kern-Dialoge aus Kalender/Tools,
Welle 2 = UpdatePrompt + Konfigurator-SaveDialog), damit die Primitive erst am Alltags-Pfad
bewiesen wird.

### Draußen — anderer Archetyp (Vollbild-Übernahme / Komponenten-Overlay), **nicht** anfassen

FokusView · TabKognitiv `.overlay`/`.countdown` · Kognitiv-Übungen (ExerciseShell,
TaskSwitching `.switchScreen`) · Fitness SessionRunner/SessionSummary · AppBriefing ·
HaushaltBriefing · TabTimer-Vollbild · TabRad-/ProjektKarte-/PlaeneTab-Overlays ·
TabFitness `.backdrop` (Dropdown). Das sind Vollbild-Modi oder Dropdown-Backdrops, kein
Backdrop+Karte-Dialog. Optik dieser Flächen → ggf. ②.

---

## Teil A — Die `<Overlay>`-Komponente

**Ort:** `src/components/Overlay/Overlay.jsx` + `Overlay.module.css`

### API

```jsx
<Overlay variant="center" | "sheet" onClose={fn} style={backdropStyle?}>
  {children /* die eigene Karte des Dialogs */}
</Overlay>
```

| Prop | Pflicht | Zweck |
|---|---|---|
| `variant` | ja | `'center'` = mittig · `'sheet'` = unten angedockt |
| `onClose` | ja | wird bei Backdrop-Tap **und** Escape aufgerufen |
| `style` | nein | wird auf den Backdrop durchgereicht — deckt Keyboard-Offset (TodoModal, BlockerModal) und BirthdaySheets `overlayStyle` ab |

`children` ist die eigene Karte des Dialogs (`.modal`/`.sheet`/`.dialog`) und behält ihr
Aussehen: Hintergrund, Border, Radius, Padding, Breite/`max-width`, Box-Shadow, `gap`.

### DOM-Struktur

```
<div class="backdrop {variant}" style={style} role="dialog" aria-modal="true" onClick={closeIfBackdrop}>
  <div class="panel {variant}">        ← trägt den Entrance
    {children}                          ← Dialog-Karte (eigenes Chrome bleibt)
  </div>
</div>
```

### Verhalten, das die Komponente zentral übernimmt

- **Backdrop einheitlich:** `background: rgba(0,0,0,0.62)` + `backdrop-filter: blur(18px) saturate(130%)` (+ `-webkit-`). Das ist der bereits etablierte Flaggschiff-Wert (TodoModal/Blocker/Zeitplan-Dialog). Backdrop blendet per Opacity ein (`--dur-fast`).
- **z-index:** `var(--z-overlay)` (neues Token = `400`). Schluss mit 200/300/400-Mix.
- **Position:** `center` → `align-items:center; justify-content:center` + Padding inkl. `env(safe-area-inset-bottom)`. `sheet` → `align-items:flex-end; justify-content:center`.
- **Backdrop-Tap schließt:** nur wenn das Backdrop selbst getroffen wurde (`e.target === e.currentTarget`). Damit braucht der Inhalt **kein** `stopPropagation` mehr.
- **Escape schließt** (NEU — hat heute kein Dialog): `keydown`-Listener auf `document`, Cleanup beim Unmount.
- **Auftritt über Motion-Tokens:** center → Keyframe `overlayIn` (Scale 0.96→1 + 6px hoch + Fade); sheet → vorhandener `slideInBottom` (translateY 100%→0 + Fade). Beide `var(--dur) var(--ease-out) both`.
- **`role="dialog"` + `aria-modal="true"`** auf dem Backdrop.
- **Reduced-Motion:** greift über den globalen `@media (prefers-reduced-motion: reduce)`-Block in `vars.css` (keine Sonderbehandlung nötig — Guard-Test sichert das ab).

### Token- & Keyframe-Zusatz in `vars.css`

```css
/* :root */
--z-overlay: 400;

/* bei den Animationen, neben toolEnter */
@keyframes overlayIn {
  from { opacity: 0; transform: scale(0.96) translateY(6px); }
  to   { opacity: 1; transform: none; }
}
```

Der reine Backdrop-Fade-Keyframe lebt lokal in `Overlay.module.css` (einzige Verwendung).
`slideInBottom` existiert bereits global.

### Bewusst **nicht** drin (YAGNI für eine Single-User-PWA)

Voller Focus-Trap / Fokus-Rückgabe. Baseline ist `role="dialog"` + `aria-modal` + Escape.
Focus-Trap ist als spätere Erweiterung notiert, nicht jetzt.

---

## Teil B — Migration

Pro Dialog identisches Muster:

1. `<div className={s.overlay} onClick=…><div className={s.modal} onClick={stop}>…</div></div>`
   → `<Overlay variant=… onClose=… style=…><div className={s.modal}>…</div></Overlay>`.
2. Aus dem `.module.css` entfernen: die `.overlay`/`.backdrop`/`.dialogOverlay`-Regel, die
   `animation:`-Zeile am Karten-Selektor, und die lokalen `@keyframes scaleIn`/`slideUp`/`fadeIn`.
3. `stopPropagation` am Inhalt entfällt.
4. Sonderfälle bleiben beim Dialog: Keyboard-Offset (TodoModal/BlockerModal) und BirthdaySheets
   `overlayStyle` wandern in das `style`-Prop; `--tool-color` bleibt am KlaerenModal-Inhalt.

**Bewusste optische Änderung:** SlotSheet/BirthdaySheet (heute rgba .55, ohne Blur) und
CheckinModal (blur4) bekommen den einheitlichen Backdrop (rgba .62 + blur18). KlaerenModal
(.70) und MissedReview (.72) werden minimal heller. Das ist gewollt (ein Standard) und wird
visuell per Preview verifiziert.

---

## Teil C — Leichte Mikro-Animationen

Genau zwei, klar begrenzt:

1. **Subtodo-Einblenden:** Ein neu hinzugefügter Unterpunkt (TodoChip-Expand-Bereich) blendet
   per `fadeInUp` (`var(--dur-fast) var(--ease-out)`) ein, statt hart zu erscheinen.
2. **Done-Übergang glätten:** Im TodoChip existiert der Erledigt-Effekt bereits konkret —
   `@keyframes doneFlash` (`.doneFlash`, heute `0.65s ease`) und die Durchstreich-Zustände
   `.chipDone .text` / `.itemDone .itemText` (`text-decoration: line-through`). Der Flash bleibt
   ein Flash, nutzt aber `var(--ease)` statt `ease`; der Durchstreich-/Opacity-Wechsel bekommt
   einen weichen `transition` über `var(--dur-fast)`, statt hart umzuspringen. Kein neues Verhalten.

**Bewusst verschoben** (nicht in ①): FLIP/animiertes Umsortieren, Listen-Stagger,
Seiten-Übergänge über das vorhandene `tabEnter` hinaus.

---

## Anti-Drift — Guard-Test

`src/components/Overlay/overlay.test.js` (im Stil von `styleguide.test.js`/`motion.test.js`):

- `vars.css` enthält `--z-overlay` **und** `@keyframes overlayIn`.
- **Keine** migrierte Dialog-`.module.css` definiert noch einen eigenen Backdrop
  (`position:fixed` + `inset:0` + `background: rgba(0,0,0,…)`) — d.h. der Voll-Backdrop existiert
  nur noch in `Overlay.module.css`. (Vollbild-Modi aus „Scope/Draußen" sind ausgenommen.)
- **Keine** migrierte Dialog-`.module.css` definiert noch `@keyframes scaleIn`/`slideUp`.

So bleibt die Regel „Dialoge nutzen die Overlay-Primitive" grep-bar erzwungen statt nur dokumentiert.

---

## Tests & Verifikation

- **Unit:** Overlay rendert children; Backdrop-Tap ruft `onClose`, Tap auf den Inhalt nicht;
  Escape ruft `onClose`; `variant` setzt die richtige Klasse.
- **Guard:** `overlay.test.js` (oben).
- **Bestehende Suite** grün halten (262+).
- **Visuell (Preview):** je ein center- und ein sheet-Dialog öffnen — Backdrop, Auftritt,
  Backdrop-Tap-Schließen, Escape; Screenshot als Nachweis.

---

## Risiken

- **Backdrop-Vereinheitlichung** ändert die Optik einiger Sheets (heller + Blur). Gewollt,
  per Preview geprüft; bei Missfallen ist der Wert an *einer* Stelle drehbar.
- **z-index 400 für alle:** Toast/UpdatePrompt-Stapelung gegenprüfen (Toast soll über Dialogen
  bleiben). Bei Bedarf Toast-z anheben — eine Stelle.
- **Panel-Wrapper vs. Karten-Breite:** Der animierte `panel`-Wrapper darf die `max-width`-Zentrierung
  der Karten (320/440/480) nicht verschieben — beim Bauen mit `width:100%` + Karten-eigener
  `max-width` lösen, per Preview prüfen.
