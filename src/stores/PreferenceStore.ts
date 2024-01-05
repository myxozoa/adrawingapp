import { create } from "zustand"

import { createSelectors } from "@/stores/selectors"

interface State {
  prefs: {
    pressureSensitivity: number
  }
}

interface Action {
  setPrefs: (prefs: Partial<State["prefs"]>) => void
}

const usePreferenceStoreBase = create<State & Action>((set) => ({
  prefs: {
    pressureSensitivity: 0.5,
  },
  setPrefs: (prefs: Partial<State["prefs"]>) =>
    set((prev) => ({
      prefs: { ...prev.prefs, ...prefs },
    })),
}))

export const usePreferenceStore = createSelectors(usePreferenceStoreBase)
