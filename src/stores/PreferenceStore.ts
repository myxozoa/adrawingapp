import { create } from "zustand"
// import { persist } from "zustand/middleware"

import { createSelectors } from "@/stores/selectors"

interface State {
  prefs: {
    pressureSensitivity: number
    pressureSmoothing: number
    mouseSmoothing: number
    canvasWidth: number
    canvasHeight: number
    usePressure: boolean
    useCoalescedEvents: boolean
    zoomCompensation: boolean
    colorDepth: 8 | 16
  }
}

interface Action {
  setPrefs: (prefs: Partial<State["prefs"]>) => void
  resetToDefault: () => void
}

export const defaultPreferences = {
  pressureSensitivity: 1.0,

  // These preferences are inverted (1-n)
  pressureSmoothing: 0.2,
  mouseSmoothing: 0.6,

  canvasWidth: 10 * 300,
  canvasHeight: 8 * 300,

  colorDepth: 16 as const,

  usePressure: true,
  useCoalescedEvents: true,
  zoomCompensation: true,
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
