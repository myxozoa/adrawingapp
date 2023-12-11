import { create } from 'zustand'
import { ColorArray } from '../types'

import { createSelectors } from './selectors'

type State = {
  color: ColorArray
}

type Action = {
  setColor: (color: ColorArray) => void
}

const useMainStoreBase = create<State & Action>((set) => ({
  color: [255, 0, 0],
  setColor: (color: ColorArray) => set(() => ({
    color
  }))
}))

export const useMainStore = createSelectors(useMainStoreBase)