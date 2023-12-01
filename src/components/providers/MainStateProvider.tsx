import { useState, useCallback } from 'react'

import { MainState } from '../../contexts/MainState'
import { ColorArray } from '../../types'

function MainStateProvider({ children }: { children: React.ReactNode }) {
  const [color, setColor] = useState<ColorArray>([255, 0, 0])

  const stateFunctions: Record<string, React.SetStateAction<any>> = {
    color: setColor,
  }

  const changeSetting = useCallback((newSettings: any) => {
    Object.keys(newSettings).forEach((setting) => {
      stateFunctions[setting](newSettings[setting])
    })
  }, [])

  return (
      <MainState.Provider value={{
        color,
        changeSetting
        }}>
        {children}
      </MainState.Provider>
  )
}

export default MainStateProvider
