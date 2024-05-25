import { Panel } from "@/components/Panel"

import { Container } from "@/components/Container"

import { useToolStore } from "@/stores/ToolStore"

import type { EyeDropperSampleSizes } from "@/types"

import { SettingSlider } from "@/components/SettingSlider"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { memo } from "react"

const sampleSizes: EyeDropperSampleSizes[] = [1, 3, 5]

function getSampleSizeLabel(sampleSize: EyeDropperSampleSizes) {
  return `${sampleSize}x${sampleSize}`
}

function _ToolSettings() {
  const currentTool = useToolStore.use.currentTool()
  const settings = useToolStore.use[currentTool.name]()
  const changeCurrentToolSetting = useToolStore.use.changeToolSetting()

  // useEffect(() => {
  //   // TODO: Fix this its horrible
  //   const raiseSize = () => {
  //     let hackyVariable = null
  //     setToolState((prev) => {
  //       if (prev.size) {
  //         let newSize = prev.size
  //         if (prev.size < 10) {
  //           newSize = prev.size + 1
  //         }

  //         if (prev.size >= 10 && prev.size < 100) {
  //           newSize = prev.size + 10
  //         }

  //         if (prev.size >= 100 && prev.size < 1000) {
  //           newSize = prev.size + 50
  //         }

  //         hackyVariable = Math.min(newSize, 1000)
  //         return { ...prev, size: hackyVariable }
  //       } else {
  //         return prev
  //       }
  //     })

  //     changeCurrentToolSetting({ size: hackyVariable })
  //   }
  //   const lowerSize = () => {
  //     let hackyVariable = null
  //     setToolState((prev) => {
  //       if (prev.size) {
  //         let newSize = prev.size
  //         if (prev.size <= 10) {
  //           newSize = prev.size - 1
  //         }

  //         if (prev.size > 10 && prev.size < 100) {
  //           newSize = prev.size - 10
  //         }

  //         if (prev.size >= 100 && prev.size < 1000) {
  //           newSize = prev.size - 50
  //         }

  //         hackyVariable = Math.max(newSize, 1)
  //         return { ...prev, size: hackyVariable }
  //       } else {
  //         return prev
  //       }
  //     })

  //     changeCurrentToolSetting({ size: hackyVariable })
  //   }
  //   const handleToolSize = (event: KeyboardEvent) => {
  //     if (event.key === "[") lowerSize()
  //     if (event.key === "]") raiseSize()
  //   }
  //   window.addEventListener("keypress", handleToolSize)

  //   return () => {
  //     window.removeEventListener("keypress", handleToolSize)
  //   }
  // }, [])

  return (
    <Container
      className={`absolute left-1/2 top-8 z-10 -translate-x-1/2 shadow-md ${
        currentTool.availableSettings.length === 0 ? "hidden" : ""
      }`}
    >
      <Panel className="flex w-full items-center">
        <div className="flex flex-col items-center justify-center lg:flex-row">
          {"size" in settings && settings.size !== undefined ? (
            <div className="lg: flex flex-row p-1 max-lg:mb-2 max-lg:border-b lg:mx-1 lg:border-r lg:pr-2">
              <SettingSlider
                name={"Size"}
                value={settings.size}
                onValueChange={(size) => changeCurrentToolSetting({ size })}
                fractionDigits={0}
                min={1}
                max={500}
              />
            </div>
          ) : null}
          {"hardness" in settings && settings.hardness !== undefined ? (
            <div className="lg: flex flex-row p-1 max-lg:mb-2 max-lg:border-b lg:mx-1 lg:border-r lg:pr-2">
              <SettingSlider
                name={"Hardness"}
                value={settings.hardness}
                onValueChange={(hardness) => changeCurrentToolSetting({ hardness })}
                fractionDigits={0}
                min={1}
                max={100}
              />
            </div>
          ) : null}
          {"opacity" in settings && settings.opacity !== undefined ? (
            <div className="lg: flex flex-row p-1 max-lg:mb-2 max-lg:border-b lg:mx-1 lg:border-r lg:pr-2">
              <SettingSlider
                name={"Opacity"}
                value={settings.opacity}
                onValueChange={(opacity) => changeCurrentToolSetting({ opacity })}
                fractionDigits={0}
                min={1}
                max={100}
              />
            </div>
          ) : null}
          {"flow" in settings && settings.flow !== undefined ? (
            <div className="lg: flex flex-row p-1 max-lg:mb-2 max-lg:border-b lg:mx-1 lg:border-r lg:pr-2">
              <SettingSlider
                name={"Flow"}
                value={settings.flow}
                onValueChange={(flow) => changeCurrentToolSetting({ flow })}
                fractionDigits={0}
                min={1}
                max={100}
              />
            </div>
          ) : null}
          {"spacing" in settings && settings.spacing !== undefined ? (
            <div className="lg: flex flex-row p-1 max-lg:mb-2 max-lg:border-b lg:mx-1 lg:border-r lg:pr-2">
              <SettingSlider
                name={"Spacing"}
                value={settings.spacing}
                onValueChange={(spacing) => changeCurrentToolSetting({ spacing })}
                fractionDigits={0}
                min={1}
                max={100}
              />
            </div>
          ) : null}
          {"sampleSize" in settings && settings.sampleSize !== undefined ? (
            <div className="lg: flex flex-row p-1 max-lg:mb-2 max-lg:border-b lg:mx-1 lg:border-r lg:pr-2">
              <div key={`sampleSize_setting`} className="flex w-fit flex-row items-center justify-center">
                <p className="pr-2 text-sm text-muted-foreground">Sample Size</p>

                <Select
                  defaultValue={getSampleSizeLabel(settings.sampleSize as EyeDropperSampleSizes)}
                  onValueChange={(sampleSize) =>
                    changeCurrentToolSetting({ sampleSize: sampleSize as unknown as EyeDropperSampleSizes })
                  }
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
            </div>
          ) : null}
        </div>
      </Panel>
    </Container>
  )
}

export const ToolSettings = memo(_ToolSettings)
