import { create } from "zustand"

import { createSelectors } from "@/stores/selectors"

type State = {
  prefs: {
    pressureSensititity: number
  }
}

type Action = {
  setPrefs: (prefs: Partial<State["prefs"]>) => void
}

const usePreferenceStoreBase = create<State & Action>((set) => ({
  prefs: {
    pressureSensititity: 1.0,
  },
  setPrefs: (prefs: Partial<State["prefs"]>) =>
    set((prev) => ({
      prefs: { ...prev.prefs, ...prefs },
    })),
}))

export const usePreferenceStore = createSelectors(usePreferenceStoreBase)
