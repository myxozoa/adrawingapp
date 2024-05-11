import { useEffect, useState, useCallback } from "react"

import Panel from "@/components/Panel"
import Container from "@/components/Container"

import { useToolStore } from "@/stores/ToolStore"

import { Slider } from "@/components/ui/slider"
import { AvailableTools } from "@/types"

const SliderSetting = (name: string, value: number, _onValueChange: (value: number) => void, props: any) => {
  const onValueChange = (value: number[]) => _onValueChange(value[0]) // Radix UI uses values in arrays to support multiple thumbs

  return (
    <div key={`${name}_setting`} className="flex h-full flex-row items-center justify-center">
      <p className="pr-2 text-sm text-foreground">{name}:</p>
      <Slider className="mr-4 w-28" {...props} value={[value]} onValueChange={onValueChange} />
      <p className="min-w-[3ch] text-sm text-foreground">{value}</p>
    </div>
  )
}

function _ToolSettings() {
  const currentTool = useToolStore.use.currentTool()
  const changeCurrentToolSetting = useToolStore.use.changeToolSetting()

  // TODO: Theres some other way to get this to be safe
  const [toolState, setToolState] = useState({
    // @ts-expect-error spent too long on this
    size: currentTool.settings.size as number | undefined,
    // @ts-expect-error spent too long on this
    hardness: currentTool.settings.hardness as number | undefined,
    // @ts-expect-error spent too long on this
    opacity: currentTool.settings.opacity as number | undefined,
    // @ts-expect-error spent too long on this
    flow: currentTool.settings.flow as number | undefined,
    // @ts-expect-error spent too long on this
    spacing: currentTool.settings.spacing as number | undefined,
  })

  const changeToolSetting = useCallback(
    (newSettings: Partial<AvailableTools>) => {
      setToolState((prev) => ({ ...prev, ...newSettings }))

      changeCurrentToolSetting(newSettings)
    },
    [currentTool],
  )

  useEffect(() => {
    // TODO: Fix this its horrible
    const raiseSize = () => {
      let hackyVariable = null
      setToolState((prev) => {
        if (prev.size) {
          let newSize = prev.size
          if (prev.size < 10) {
            newSize = prev.size + 1
          }

          if (prev.size >= 10 && prev.size < 100) {
            newSize = prev.size + 10
          }

          if (prev.size >= 100 && prev.size < 1000) {
            newSize = prev.size + 50
          }

          hackyVariable = Math.min(newSize, 1000)
          return { ...prev, size: hackyVariable }
        } else {
          return prev
        }
      })

      changeCurrentToolSetting({ size: hackyVariable })
    }
    const lowerSize = () => {
      let hackyVariable = null
      setToolState((prev) => {
        if (prev.size) {
          let newSize = prev.size
          if (prev.size <= 10) {
            newSize = prev.size - 1
          }

          if (prev.size > 10 && prev.size < 100) {
            newSize = prev.size - 10
          }

          if (prev.size >= 100 && prev.size < 1000) {
            newSize = prev.size - 50
          }

          hackyVariable = Math.max(newSize, 1)
          return { ...prev, size: hackyVariable }
        } else {
          return prev
        }
      })

      changeCurrentToolSetting({ size: hackyVariable })
    }
    const handleToolSize = (event: KeyboardEvent) => {
      if (event.key === "[") lowerSize()
      if (event.key === "]") raiseSize()
    }
    window.addEventListener("keypress", handleToolSize)

    return () => {
      window.removeEventListener("keypress", handleToolSize)
    }
  }, [])

  useEffect(() => {
    setToolState({
      // @ts-expect-error spent too long on this
      size: currentTool.settings.size as number | undefined,
      // @ts-expect-error spent too long on this
      hardness: currentTool.settings.hardness as number | undefined,
      // @ts-expect-error spent too long on this
      opacity: currentTool.settings.opacity as number | undefined,
      // @ts-expect-error spent too long on this
      flow: currentTool.settings.flow as number | undefined,
      // @ts-expect-error spent too long on this
      spacing: currentTool.settings.spacing as number | undefined,
    })
  }, [currentTool])

  const elements: Record<keyof typeof currentTool, React.ReactNode> = {
    size:
      toolState.size !== undefined
        ? SliderSetting("Size", toolState.size, (size) => changeToolSetting({ size }), {
            min: 1,
            max: 500,
          })
        : null,
    hardness:
      toolState.hardness !== undefined
        ? SliderSetting("Hardness", toolState.hardness, (hardness) => changeToolSetting({ hardness }), {
            min: 1,
            max: 100,
          })
        : null,
    opacity:
      toolState.opacity !== undefined
        ? SliderSetting("opacity", toolState.opacity, (opacity) => changeToolSetting({ opacity }), {
            min: 1,
            max: 100,
          })
        : null,
    flow:
      toolState.flow !== undefined
        ? SliderSetting("Flow", toolState.flow, (flow) => changeToolSetting({ flow }), {
            min: 1,
            max: 100,
          })
        : null,
    spacing:
      toolState.spacing !== undefined
        ? SliderSetting("Spacing", toolState.spacing, (spacing) => changeToolSetting({ spacing }), {
            min: 1,
            max: 100,
          })
        : null,
  }

  return (
    <Container
      className={`absolute left-1/2 top-8 z-10 -translate-x-1/2 shadow-md ${
        currentTool.availableSettings.length === 0 ? "hidden" : ""
      }`}
    >
      <Panel className="flex w-full items-center">
        <div className="flex flex-col items-center justify-center lg:flex-row">
          {/* <ToolPreview /> */}
          {currentTool.availableSettings.map((setting) => {
            return (
              <div
                key={"tool_settings" + setting}
                className="lg: flex flex-row p-1 max-lg:mb-2 max-lg:border-b lg:mx-1 lg:border-r lg:pr-2"
              >
                {elements[setting]}
              </div>
            )
          })}
        </div>
      </Panel>
    </Container>
  )
}

export const ToolSettings = _ToolSettings
