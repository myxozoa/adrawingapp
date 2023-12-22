import { useEffect, useState, useCallback } from "react"

import Panel from "@/components/Panel"
import Container from "@/components/Container"
// import { ToolPreview } from '@/components/ToolPreview'

import { useToolStore } from "@/stores/ToolStore"
import { useMainStore } from "@/stores/MainStore"

import { throttle, hexToRgb, rgbToHex } from "@/utils"

import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"

const SliderSetting = (
  name: string,
  value: number,
  _onValueChange: (value: any) => void,
  dependency: any,
  props: any,
) => {
  const onValueChange = (value: number[]) => _onValueChange(value[0]) // Radix UI uses values in arrays to support multiple thumbs
  const handler = useCallback(throttle(onValueChange, 16), [dependency])

  return (
    <div key={`${name}_setting`} className="h-full flex flex-row justify-center items-center">
      <p className="pr-2 text-sm text-muted-foreground">{name}</p>
      <Slider className="w-28 mr-4" {...props} value={[value]} onValueChange={handler} />
      <p className="text-sm text-muted-foreground mr-2 w-[3ch]">{value}</p>
    </div>
  )
}

function _ToolSettings() {
  const currentTool = useToolStore.use.currentTool()
  const changeCurrentToolSetting = useToolStore.use.changeToolSetting()
  const color = useMainStore.use.color()
  const setColor = useMainStore.use.setColor()

  const [toolState, setToolState] = useState({
    size: currentTool.size,
    hardness: currentTool.hardness,
    flow: currentTool.flow,
    spacing: currentTool.spacing,
  })

  const changeToolSetting = useCallback(
    (newSettings: any) => {
      Object.keys(newSettings).forEach((setting) => {
        setToolState((prev) => ({ ...prev, [setting]: newSettings[setting] }))
      })

      changeCurrentToolSetting(newSettings)
    },
    [currentTool],
  )

  useEffect(() => {
    // TODO: Fix this its horrible
    const raiseSize = () => {
      let hackyVariable = null
      setToolState((prev) => {
        hackyVariable = Math.min(prev.size + 5, 100)
        return { ...prev, size: hackyVariable }
      })

      changeCurrentToolSetting({ size: hackyVariable })
    }
    const lowerSize = () => {
      let hackyVariable = null
      setToolState((prev) => {
        hackyVariable = Math.max(prev.size - 5, 1)
        return { ...prev, size: hackyVariable }
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
      size: currentTool.size,
      hardness: currentTool.hardness,
      flow: currentTool.flow,
      spacing: currentTool.spacing,
    })
  }, [currentTool])

  const changeColor = (event: React.ChangeEvent<HTMLInputElement>) => setColor(hexToRgb(event.target!.value)!)!

  const elements: Record<keyof typeof currentTool, React.ReactNode> = {
    color: <input type="color" value={rgbToHex(color)} onChange={useCallback(throttle(changeColor, 60), [])} />,
    size: SliderSetting("Size", toolState.size, (size) => changeToolSetting({ size }), currentTool, {
      min: 1,
      max: 100,
    }),
    hardness: SliderSetting(
      "Hardness",
      toolState.hardness,
      (hardness) => changeToolSetting({ hardness }),
      currentTool,
      { min: 1, max: 100 },
    ),
    flow: SliderSetting("Flow", toolState.flow, (flow) => changeToolSetting({ flow }), currentTool, {
      min: 1,
      max: 100,
    }),
    spacing: SliderSetting("Spacing", toolState.spacing, (spacing) => changeToolSetting({ spacing }), currentTool, {
      min: 1,
      max: 50,
    }),
  }

  return (
    <Container className="h-10">
      <Panel className="w-full h-full flex items-center">
        <div className="flex flex-row">
          {/* <ToolPreview /> */}
          {currentTool.availableSettings.map((setting) => {
            return (
              <div key={"tool_settings" + setting} className="pr-4 flex flex-row">
                {elements[setting]}
                <Separator orientation="vertical" />
              </div>
            )
          })}
        </div>
      </Panel>
    </Container>
  )
}

export const ToolSettings = _ToolSettings
