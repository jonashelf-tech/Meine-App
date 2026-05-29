export const MODULE_CONFIG = {
  alertness: {
    id: 'alertness',
    name: 'Alertness',
    desc: 'Tippe so schnell wie möglich wenn der Kreis erscheint.',
    duration: 'ca. 2,5 Minuten',
    measured: ['Reaktionszeit (ms)', 'Fehler (Falschtippen)', 'Auslasser (verpasst)'],
    notMeasured: ['Intelligenz', 'Ablenkungen außerhalb des Screens'],
    mainMetricLabel: 'Ø Reaktionszeit',
    mainMetricUnit: 'ms',
    variants: ['Ohne Ton', 'Mit Warnton'],
    defaultVariant: 'Ohne Ton',
  },
  zahlensuche: {
    id: 'zahlensuche',
    name: 'Zahlensuche',
    desc: '25 Felder mit Zahlen 01–25. Tippe sie in Reihenfolge so schnell wie möglich.',
    duration: 'ca. 2–4 Minuten',
    measured: ['Gesamtzeit (s)', 'Fehler', 'Zeit pro Zahl'],
    notMeasured: ['Rechenkenntnisse', 'Ablenkungen außerhalb des Screens'],
    mainMetricLabel: 'Gesamtzeit',
    mainMetricUnit: 's',
    variants: ['Normal', 'Schwer', 'Rückwärts'],
    defaultVariant: 'Normal',
  },
  gedaechtnis: {
    id: 'gedaechtnis',
    name: 'Arbeitsgedächtnis',
    desc: '12 Kreise leuchten nacheinander auf — merke dir die Sequenz.',
    duration: 'ca. 5 Minuten',
    measured: ['Korrekte Sequenzen (max. 8)', 'Fehler pro Runde', 'Max. Sequenzlänge'],
    notMeasured: ['Gesamtintelligenz', 'Tagesform außerhalb der Übung'],
    mainMetricLabel: 'Korrekte',
    mainMetricUnit: '/ 8',
    variants: ['Normal', 'Schwer'],
    defaultVariant: 'Normal',
  },
}

export const MODULE_ORDER = ['alertness', 'zahlensuche', 'gedaechtnis']
export const PHASE2_MODULES = ['vigilanz', 'selektion', 'geteilt']
