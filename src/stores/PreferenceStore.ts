import { create } from "zustand"
// import { persist } from "zustand/middleware"

import { createSelectors } from "@/stores/selectors"

interface State {
  prefs: {
    pressureSensitivity: number
    pressureSmoothing: number
    pointerSmoothing: number
    canvasWidth: number
    canvasHeight: number
    canvasPPI: number
    usePressure: boolean
    useCoalescedEvents: boolean
    zoomCompensation: boolean
    colorDepth: 8 | 16
    clampPressure: boolean
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
  pointerSmoothing: 0.4,

  canvasWidth: 10 * 300,
  canvasHeight: 8 * 300,
  canvasPPI: 300,

  colorDepth: 16 as const,

  clampPressure: true,

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

export const getPreference = <T extends keyof State["prefs"]>(request: T): State["prefs"][T] =>
  usePreferenceStore.getState().prefs[request]

const exp = (value: number) => {
  return value ** 0.8
}

export const getPointerSmoothing = () => {
  const smoothing = getPreference("pointerSmoothing")

  return 1 - exp(smoothing)
}

export const getPressureSmoothing = () => {
  const smoothing = getPreference("pressureSmoothing")

  return 1 - exp(smoothing)
}
