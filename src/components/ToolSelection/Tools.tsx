import { memo, useCallback } from "react"

import { Panel } from "@/components/Panel"
import { Container } from "@/components/Container"
import { Tool } from "@/components/ToolSelection/Tool"

import { useToolStore } from "@/stores/ToolStore"

import { tools } from "@/stores/ToolStore"

import { hexToRgb, rgbToHex } from "@/utils/colors"
import { useMainStore } from "@/stores/MainStore"
import { Application } from "@/managers/ApplicationManager"
import type { ToolName } from "@/types"

function _Tools() {
  const currentTool = useToolStore.use.currentTool()
  const _setCurrentTool = useToolStore.use.setCurrentTool()
  const color = useMainStore.use.color()
  const setColor = useMainStore.use.setColor()

  const changeColor = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const rgb = hexToRgb(event.target.value)

    if (rgb) setColor(rgb)
  }, [])

  const setCurrentTool = useCallback((name: ToolName) => {
    Application.swapTool(tools[name])
    _setCurrentTool(name)
  }, [])

  return (
    <Container className="absolute top-1/2 z-10 w-11 -translate-y-1/2 shadow-md">
      <Panel className="flex w-full grow flex-col justify-between">
        <div>
          {Object.values(tools).map((tool) => {
            return (
              <Tool
                key={tool.name}
                name={tool.name}
                select={setCurrentTool}
                selected={currentTool.name === tool.name}
              />
            )
          })}
        </div>
        <input className="w-auto rounded-sm	" type="color" value={rgbToHex(color)} onChange={changeColor} />
      </Panel>
    </Container>
  )
}

export const Tools = memo(_Tools)
