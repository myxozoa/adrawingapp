import { Panel } from "@/components/Panel"

import { Container } from "@/components/Container"

import { useToolStore } from "@/stores/ToolStore"

import type { EyeDropperSampleSizes } from "@/types"

import { BarChart } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { SettingSlider } from "@/components/SettingSlider"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { memo } from "react"
import { usePreferenceStore } from "@/stores/PreferenceStore"

import { ChevronDown } from "lucide-react"

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
const sampleSizes: EyeDropperSampleSizes[] = [1, 3, 5]

function getSampleSizeLabel(sampleSize: EyeDropperSampleSizes) {
  return `${sampleSize}x${sampleSize}`
}

function _ToolSettings() {
  const prefs = usePreferenceStore.use.prefs()
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
        <div className="flex flex-row items-center justify-center">
          {"size" in settings && settings.size !== undefined ? (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="xs" variant="ghost">
                    <Label>Size:</Label>
                    <Label className="w-[3ch]">{settings.size}</Label>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="flex w-fit flex-row p-1">
                    <SettingSlider
                      name=""
                      hideText={true}
                      value={settings.size}
                      onValueChange={(size) => changeCurrentToolSetting({ size })}
                      fractionDigits={0}
                      min={1}
                      max={500}
                    />
                    <Toggle
                      size="xs"
                      aria-label="Toggle Tool Size Pressure"
                      pressed={settings.sizePressure}
                      onPressedChange={() => changeCurrentToolSetting({ sizePressure: !settings.sizePressure })}
                      disabled={!prefs.usePressure}
                    >
                      <BarChart className="h-4 w-4" />
                    </Toggle>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          ) : null}
          {"hardness" in settings && settings.hardness !== undefined ? (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="xs" variant="ghost">
                    <Label>Hardness:</Label>
                    <Label className="w-[3ch]">{settings.hardness}</Label>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="flex flex-row p-1">
                    <SettingSlider
                      name=""
                      hideText={true}
                      value={settings.hardness}
                      onValueChange={(hardness) => changeCurrentToolSetting({ hardness })}
                      fractionDigits={0}
                      min={1}
                      max={100}
                    />
                    <Toggle
                      size="xs"
                      aria-label="Toggle Tool Hardness Pressure"
                      pressed={settings.hardnessPressure}
                      onPressedChange={() => changeCurrentToolSetting({ hardnessPressure: !settings.hardnessPressure })}
                      disabled={!prefs.usePressure}
                    >
                      <BarChart className="h-4 w-4" />
                    </Toggle>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          ) : null}
          {"flow" in settings && settings.flow !== undefined ? (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="xs" variant="ghost">
                    <Label>Flow:</Label>
                    <Label className="w-[3ch]">{settings.flow}</Label>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="flex flex-row p-1">
                    <SettingSlider
                      name=""
                      hideText={true}
                      value={settings.flow}
                      onValueChange={(flow) => changeCurrentToolSetting({ flow })}
                      fractionDigits={0}
                      min={1}
                      max={100}
                    />
                    <Toggle
                      size="xs"
                      aria-label="Toggle Tool Flow Pressure"
                      pressed={settings.flowPressure}
                      onPressedChange={() => changeCurrentToolSetting({ flowPressure: !settings.flowPressure })}
                      disabled={!prefs.usePressure}
                    >
                      <BarChart className="h-4 w-4" />
                    </Toggle>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          ) : null}
          {"opacity" in settings && settings.opacity !== undefined ? (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="xs" variant="ghost">
                    <Label>Opacity:</Label>
                    <Label className="w-[3ch]">{settings.opacity}</Label>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="flex flex-row p-1">
                    <SettingSlider
                      name=""
                      hideText={true}
                      value={settings.opacity}
                      onValueChange={(opacity) => changeCurrentToolSetting({ opacity })}
                      fractionDigits={0}
                      min={1}
                      max={100}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </>
          ) : null}
          {"spacing" in settings && settings.spacing !== undefined ? (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="xs" variant="ghost">
                    <Label>Spacing:</Label>
                    <Label className="w-[3ch]">{settings.spacing}</Label>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="flex flex-row p-1">
                    <SettingSlider
                      name=""
                      hideText={true}
                      value={settings.spacing}
                      onValueChange={(spacing) => changeCurrentToolSetting({ spacing })}
                      fractionDigits={0}
                      min={1}
                      max={100}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </>
          ) : null}
          {"sampleSize" in settings && settings.sampleSize !== undefined ? (
            <div className="flex flex-row p-1">
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
