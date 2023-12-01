import { createContext } from "react"

import { MainStateType } from "../types"

const defaultValue: MainStateType = { color: [255, 0, 0] } as MainStateType

export const MainState = createContext(defaultValue)