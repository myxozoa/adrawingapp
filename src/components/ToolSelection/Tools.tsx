import { memo } from "react"

import Panel from "@/components/Panel"
import Container from "@/components/Container"
import Tool from "@/components/ToolSelection/Tool"

import { useToolStore } from "@/stores/ToolStore"

import { tools } from "@/stores/ToolStore"
import { DarkModeToggle } from "@/components/DarkModeToggle"

function _Tools() {
  const currentTool = useToolStore.use.currentTool()
  const setCurrentTool = useToolStore.use.setCurrentTool()

  return (
    <Container className="w-12">
      <Panel className="flex flex-col grow w-full justify-between">
        <div>
          {Object.values(tools).map((tool) => {
            if (tool.name === "PEN") return
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

        <DarkModeToggle />
      </Panel>
    </Container>
  )
}

export const Tools = memo(_Tools)
