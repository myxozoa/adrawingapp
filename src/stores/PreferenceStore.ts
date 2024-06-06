import { create } from "zustand"
// import { persist } from "zustand/middleware"

import { createSelectors } from "@/stores/selectors"

interface State {
  prefs: {
    pressureSensitivity: number
    pressureFiltering: number
    pressureSmoothing: number
    mouseFiltering: number
    mouseSmoothing: number
    canvasWidth: number
    canvasHeight: number
    usePressure: boolean
    useCoalescedEvents: boolean
  }
}

interface Action {
  setPrefs: (prefs: Partial<State["prefs"]>) => void
  resetToDefault: () => void
}

export const defaultPreferences = {
  pressureSensitivity: 1.0,
  pressureSmoothing: 0.5,

  // These preferences are inverted (1-n)
  pressureFiltering: 0.8,
  mouseFiltering: 0.8,
  mouseSmoothing: 0.6,

  canvasWidth: 10 * 300,
  canvasHeight: 8 * 300,

  usePressure: true,
  useCoalescedEvents: true,
}

const usePreferenceStoreBase = create<State & Action>()(
  // persist(
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
  // {
  //   name: "preferences",
  // },
  // ),
)

export const usePreferenceStore = createSelectors(usePreferenceStoreBase)
