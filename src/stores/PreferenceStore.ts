import { create } from "zustand"
import { persist } from "zustand/middleware"

import { createSelectors } from "@/stores/selectors"

interface State {
  prefs: {
    pressureSensitivity: number
    pressureFiltering: number
    mouseFiltering: number
    mouseSmoothing: number
    canvasWidth: number
    canvasHeight: number
  }
}

interface Action {
  setPrefs: (prefs: Partial<State["prefs"]>) => void
  resetToDefault: () => void
}

export const defaultPreferences = {
  pressureSensitivity: 0.9,

  // These preferences are inverted (1-n)
  pressureFiltering: 0.6,
  mouseFiltering: 0.8,
  mouseSmoothing: 0.7,

  canvasWidth: 10 * 300,
  canvasHeight: 8 * 300,
}

const usePreferenceStoreBase = create<State & Action>()(
  persist(
    (set) => ({
      prefs: defaultPreferences,
      setPrefs: (prefs: Partial<State["prefs"]>) =>
        set((prev) => ({
          prefs: { ...prev.prefs, ...prefs },
        })),
      resetToDefault: () => {
        set(() => ({
          prefs: { ...defaultPreferences },
        }))
      },
    }),
    {
      name: "preferences",
    },
  ),
)

export const usePreferenceStore = createSelectors(usePreferenceStoreBase)
