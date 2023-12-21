import { create } from 'zustand'
import { ColorArray } from '@/types'

import { createSelectors } from '@/stores/selectors'

type State = {
  color: ColorArray
}

type Action = {
  setColor: (color: ColorArray) => void
}

const useMainStoreBase = create<State & Action>((set) => ({
  color: [0, 0, 0],
  setColor: (color: ColorArray) => set(() => ({
    color
  }))
}))

export const useMainStore = createSelectors(useMainStoreBase)