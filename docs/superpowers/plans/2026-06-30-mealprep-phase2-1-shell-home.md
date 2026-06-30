# Mealprep-Rework Phase 2.1 — Shell + Zuhause

> UI-Phase: leichtgewichtiger Plan (Struktur + Schlüssel-Logik als Code), Verifikation per Preview-Screenshot statt Unit-Tests. Build-Show-Schleife.

**Goal:** Die 5-Tab-Leiste weicht einem Home-first-Aufbau: man landet auf einem Zuhause (Hero-CTA + Bibliothek), Unterseiten öffnen mit Zurück — Muster wie Kognitiv/Fitness.

**Architektur:** `TabRezepte` wird vom `tab`-Umschalter zum `screen`-Router (Default `home`). Neuer `MealprepHome` als Startseite. Bestehende Unterseiten (Sammlung/Grossrezepte/Zutaten/Konfigurator/Kochen) bleiben funktional unverändert, werden nur via Sub-Header (← Zurück) statt Tab-Leiste erreicht. Korb-Logik unangetastet.

**Spec:** `kontext/mealprep-rework.md` (Abschnitt „Neuer Aufbau" → Zuhause + Bibliothek).

---

## Datei-Struktur

- **Create:** `src/features/tools/rezepte/MealprepHome.jsx` — Startseite (Hero + Bibliothek-Liste + Mehr)
- **Create:** `src/features/tools/rezepte/MealprepHome.module.css` — Look nach Tool-Design-Sprache (Hero-Karte, Gradient-CTA in `--tool-color`, Section-Labels, Listen-Rows)
- **Modify:** `src/features/tools/rezepte/TabRezepte.jsx` — `tab` → `screen`-Router (`home` default), Sub-Header für Unterseiten, Smart-CTA-Routing, Back-Interceptor erweitert
- **Modify:** `src/features/tools/rezepte/TabRezepte.module.css` — `.subHead`/`.subBack`/`.subTitle` ergänzen; alte `.tabBar*` entfernen

---

## Schlüssel-Logik (verbindlich)

**Smart-CTA (Korb leer → Auswahl, sonst → Kochen):**
```js
const startDurchgang = () =>
  setScreen(korb.eintraege.length > 0 ? 'kochen' : 'rezepte')
```

**Screen-Router + Back-Interceptor (ersetzt die tab-Logik):**
```js
const [screen, setScreen] = useState('home')   // home | rezepte | ketten | konfig | zutaten | kochen
// Hardware-/Gesten-Zurück: Editor → View → Unterseite → Home → Tool verlassen
useEffect(() => {
  setBackInterceptor(
    editing !== null   ? () => setEditing(null)
    : viewing !== null ? () => setViewing(null)
    : screen !== 'home' ? () => setScreen('home')
    : null
  )
  return () => setBackInterceptor(null)
}, [editing, viewing, screen, setBackInterceptor])
```

**Render-Struktur:** `home` → `<ToolHeader …/><MealprepHome …/>`. Jede Unterseite → `<div className={s.subHead}><button onClick={()=>setScreen('home')}>← Zurück</button><span>Titel</span></div>` + bestehende Sub-View mit unveränderten `sharedProps`. Overlays (View/Editor) bleiben wie sie sind.

**MealprepHome-Props:** `{ korb, rezepte, zutaten, toolColor, onStartDurchgang, onOpenRezepte, onOpenKetten, onOpenZutaten, onOpenKonfig }`. Zählwerte: `rezepte.length`, `rezepte.filter(istBasis).length` (Ketten), `zutaten.length`, `korb.eintraege.length`.

---

## Tasks

- [ ] **Task 1: `MealprepHome.jsx` + `.module.css` anlegen** — Hero (Kicker+Dot, Titel „Jetzt kochen", Meta, Gradient-CTA „Durchgang starten"/„…fortsetzen" + Korb-Hinweis), Bibliothek-Liste (Rezepte/Ketten/Zutaten mit Count + Chevron), Mehr (Konfigurator). Icons aus `./icons` (IconBook/IconLayers/IconCarrot/IconSliders/IconBasket/IconChevron) + inline Pfeil. CSS: `--tool-color` als Akzent, Gradient-CTA `linear-gradient(135deg, color-mix(in srgb, var(--tool-color) 78%, white), var(--tool-color))`, Labels caps+letter-spacing, Akzentlinie mit transparenten Enden (kein abgehackter Rand).
- [ ] **Task 2: `TabRezepte.jsx` auf Screen-Router umbauen** — `tab`→`screen`, MealprepHome auf `home`, Sub-Header für die 5 Unterseiten, Smart-CTA, Back-Interceptor (s.o.). Imports: `MealprepHome`, `istBasis`.
- [ ] **Task 3: `TabRezepte.module.css`** — `.subHead/.subBack/.subTitle` ergänzen, tote `.tabBar*`-Regeln entfernen (Surgical: nur was verwaist).
- [ ] **Task 4: Verifikation** — `npm test` grün (keine Logik berührt, aber Sicherheitsnetz), `npm run build` ok. Preview starten, Tool „Mealprep" öffnen, **Screenshot des Home** + Klick „Rezepte"/Zurück gegenprüfen. Bei Screenshot-Timeout: `preview_snapshot` für Struktur.

## Nicht in 2.1 (Folgeschritt 2.2)

Optischer Reskin der Rezepte-/Ketten-Übersicht selbst (Sammlung/Grossrezepte-Innenleben). 2.1 macht sie nur über das schöne Home erreichbar; ihr Innenleben bleibt vorerst wie gehabt.

## Erfolgskriterien

- Tool öffnet auf dem Zuhause (nicht mehr 5 Tabs).
- „Durchgang starten" führt bei leerem Korb in die Rezept-Auswahl, sonst ins Kochen.
- Jede Bibliothek-Seite ist per Tap erreichbar und per Zurück (Button + Hardware) wieder verlassbar.
- Keine Test-Regression, Build grün.
