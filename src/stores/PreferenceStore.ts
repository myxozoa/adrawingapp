import { create } from "zustand"
import { persist } from "zustand/middleware"

import { createSelectors } from "@/stores/selectors"

interface State {
  prefs: {
    pressureSensitivity: number
    pressureFiltering: number
    mouseFiltering: number
    mouseSmoothing: number
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
        pressureFiltering: 0.9,
        mouseFiltering: 0.7,
        mouseSmoothing: 0.7,
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
