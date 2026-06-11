import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Echte Bug-Fänger — bleiben strikt
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // React-Compiler-Preview-Regeln: die App nutzt den Compiler nicht.
      // Sie melden etablierte, funktionierende Muster (Refs im Render für
      // Timer/Drag, Restore-Effects beim Mount). Bei Compiler-Einführung
      // wieder aktivieren und die Muster dann gezielt umbauen.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/static-components': 'off',

      // Registry-/Content-Module (toolRegistry, glyphs, briefingContent, Toast)
      // exportieren bewusst Komponenten + Daten gemischt — kostet nur HMR-Komfort.
      'react-refresh/only-export-components': 'off',

      // Leere catch-Blöcke sind hier bewusst (Audio/Vibration/OPFS optional)
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
])
