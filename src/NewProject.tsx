"use client"

import { usePreferenceStore } from "@/stores/PreferenceStore"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Link1Icon, LinkNone1Icon } from "@radix-ui/react-icons"

import { useState, useCallback } from "react"

function App() {
  const router = useRouter()
  const prefs = usePreferenceStore.use.prefs()

  const [width, setWidth] = useState(prefs.canvasWidth)
  const [height, setHeight] = useState(prefs.canvasHeight)
  const [link, setLink] = useState(false)
  const [colorDepth, setColorDepth] = useState<8 | 16>(8)
  const setPrefs = usePreferenceStore.use.setPrefs()

  const handleWidth = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value)
      setWidth(value)

      if (link) setHeight(value)
    },
    [link],
  )

  const handleHeight = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value)

      setHeight(value)

      if (link) setWidth(value)
    },
    [link],
  )

  const handleLink = useCallback(() => setLink(!link), [link])

  const handleColorDepth = useCallback(() => setColorDepth(colorDepth === 8 ? 16 : 8), [colorDepth])

  const handleSubmit = useCallback(() => {
    setPrefs({
      canvasWidth: width,
      canvasHeight: height,
      colorDepth,
    })
    document.cookie = "allow-edit=true"
    router.push("/canvas")
  }, [width, height, colorDepth])

  return (
    <div className="flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <div className="rounded-sm border p-10">
        <div className="flex w-full items-center">
          <div className="pr-5">
            <div className="flex items-center pb-2">
              <Label className="pr-12" htmlFor="new_project_width">
                Width:
              </Label>
              <Input
                type="number"
                id="new_project_width"
                pattern="[0-9]*"
                min={1}
                max={500}
                className="w-[6ch] p-0 text-center"
                value={width.toString()}
                onChange={handleWidth}
              />
            </div>
            <div className="flex items-center pb-2">
              <Label className="pr-11" htmlFor="new_project_height">
                Height:
              </Label>
              <Input
                type="number"
                pattern="[0-9]*"
                min={1}
                max={500}
                className="w-[6ch] p-0 text-center"
                id="new_project_height"
                value={height.toString()}
                onChange={handleHeight}
              />
            </div>
          </div>

          <div>
            <Toggle variant={"outline"} className="h-8 w-8 p-0" onClick={handleLink}>
              {link ? <Link1Icon className="h-4 w-4" /> : <LinkNone1Icon className="h-4 w-4" />}
            </Toggle>
          </div>
        </div>

        <div className="flex w-full items-center pb-2">
          <p className="cursor-default pr-2.5 text-sm font-normal leading-none text-muted-foreground">Color Depth: </p>
          <Select defaultValue={colorDepth.toString()} onValueChange={handleColorDepth}>
            <SelectTrigger className="pl-4">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={"8"}>8bit</SelectItem>
                <SelectItem value={"16"}>16bit</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Button variant={"outline"} onClick={handleSubmit}>
          New Project
        </Button>
      </div>
    </div>
  )
}

export default App
