import AlertnessExercise     from './AlertnessExercise'
import ZahlensucheExercise   from './ZahlensucheExercise'
import GedaechtnisExercise   from './GedaechtnisExercise'
import GoNoGoExercise        from './GoNoGoExercise'
import NBackExercise         from './NBackExercise'
import TaskSwitchingExercise from './TaskSwitchingExercise'
import StroopExercise        from './StroopExercise'
import SpeedSortExercise     from './SpeedSortExercise'

// Single Source of Truth: moduleId → Übungs-Komponente.
// Genutzt von TabKognitiv (Einzelspiel) und EinheitRunner (Bundle).
// 'geteilt' ist bewusst NICHT enthalten (archiviert, nicht mehr startbar).
export const EXERCISES = {
  alertness:     AlertnessExercise,
  zahlensuche:   ZahlensucheExercise,
  gedaechtnis:   GedaechtnisExercise,
  gonogo:        GoNoGoExercise,
  nback:         NBackExercise,
  taskswitching: TaskSwitchingExercise,
  stroop:        StroopExercise,
  speedsort:     SpeedSortExercise,
}
