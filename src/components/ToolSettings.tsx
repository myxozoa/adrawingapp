import { useEffect, useState, useCallback } from "react"

import Panel from "@/components/Panel"
import Container from "@/components/Container"

import { useToolStore } from "@/stores/ToolStore"

import type { AvailableTools, EyeDropperSampleSizes } from "@/types"

import { SettingSlider } from "@/components/SettingSlider"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const sampleSizes: EyeDropperSampleSizes[] = [1, 3, 5]

function getSampleSizeLabel(sampleSize: EyeDropperSampleSizes) {
  return `${sampleSize}x${sampleSize}`
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
    // @ts-expect-error spent too long on this
    sampleSize: currentTool.settings.sampleSize as number | undefined,
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
      // @ts-expect-error spent too long on this
      sampleSize: currentTool.settings.sampleSize as number | undefined,
    })
  }, [currentTool])

  const elements: Record<keyof typeof currentTool, React.ReactNode> = {
    size:
      toolState.size !== undefined ? (
        <SettingSlider
          name={"Size"}
          value={toolState.size}
          onValueChange={(size) => changeToolSetting({ size })}
          fractionDigits={0}
          min={1}
          max={500}
        />
      ) : null,
    hardness:
      toolState.hardness !== undefined ? (
        <SettingSlider
          name={"Hardness"}
          value={toolState.hardness}
          onValueChange={(hardness) => changeToolSetting({ hardness })}
          fractionDigits={0}
          min={1}
          max={100}
        />
      ) : null,
    opacity:
      toolState.opacity !== undefined ? (
        <SettingSlider
          name={"Opacity"}
          value={toolState.opacity}
          onValueChange={(opacity) => changeToolSetting({ opacity })}
          fractionDigits={0}
          min={1}
          max={100}
        />
      ) : null,
    flow:
      toolState.flow !== undefined ? (
        <SettingSlider
          name={"Flow"}
          value={toolState.flow}
          onValueChange={(flow) => changeToolSetting({ flow })}
          fractionDigits={0}
          min={1}
          max={100}
        />
      ) : null,
    spacing:
      toolState.spacing !== undefined ? (
        <SettingSlider
          name={"Spacing"}
          value={toolState.spacing}
          onValueChange={(spacing) => changeToolSetting({ spacing })}
          fractionDigits={0}
          min={1}
          max={100}
        />
      ) : null,
    sampleSize:
      toolState.sampleSize !== undefined ? (
        <div key={`sampleSize_setting`} className="flex w-fit flex-row items-center justify-center">
          <p className="pr-2 text-sm text-muted-foreground">Sample Size</p>

          <Select
            defaultValue={getSampleSizeLabel(toolState.sampleSize as EyeDropperSampleSizes)}
            onValueChange={(sampleSize) => changeToolSetting({ sampleSize })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {sampleSizes.map((size, index) => {
                  const label = getSampleSizeLabel(size)
                  return (
                    <SelectItem key={`eyedropperSampleSizes${index}`} value={label}>
                      {label}
                    </SelectItem>
                  )
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      ) : null,
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
