import { create } from "zustand"

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

const usePreferenceStoreBase = create<State & Action>((set) => ({
  prefs: {
    pressureSensitivity: 0.4,
    pressureFiltering: 0.6,
    mouseFiltering: 0.5,
    mouseSmoothing: 0.8,
  },
  setPrefs: (prefs: Partial<State["prefs"]>) =>
    set((prev) => ({
      prefs: { ...prev.prefs, ...prefs },
    })),
}))

export const usePreferenceStore = createSelectors(usePreferenceStoreBase)
