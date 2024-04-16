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
}

const usePreferenceStoreBase = create<State & Action>()(
  persist(
    (set) => ({
      prefs: {
        pressureSensitivity: 0.8,
        // These preferences are inverted (1-n)
        pressureFiltering: 0.1,
        mouseFiltering: 0.3,
        mouseSmoothing: 0.3,
        canvasWidth: 8000,
        canvasHeight: 5000,
      },
      setPrefs: (prefs: Partial<State["prefs"]>) =>
        set((prev) => ({
          prefs: { ...prev.prefs, ...prefs },
        })),
    }),
    {
      name: "preferences",
    },
  ),
)

export const usePreferenceStore = createSelectors(usePreferenceStoreBase)
