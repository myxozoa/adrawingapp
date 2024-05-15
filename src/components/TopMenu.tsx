import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
  MenubarSeparator,
} from "@/components/ui/menubar"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { ResourceManager } from "@/managers/ResourceManager"
import { Slider } from "@/components/ui/slider"
import { usePreferenceStore } from "@/stores/PreferenceStore"
import { DrawingManager } from "@/managers/DrawingManager"
import { Application } from "@/managers/ApplicationManager"

import { readPixelsAsync } from "@/utils/asyncReadback"

import { uint16ToFloat16 } from "@/utils/utils"

function flipVertically(imageData: ImageData) {
  const width = imageData.width
  const height = imageData.height
  const data = imageData.data
  const bytesPerPixel = 4 // RGBA
  const rowSize = width * bytesPerPixel
  const tempRow = new Uint8ClampedArray(rowSize)

  for (let y = 0; y < height / 2; y++) {
    const topRowStart = y * rowSize
    const bottomRowStart = (height - 1 - y) * rowSize

    // Save the top row to the temp row
    tempRow.set(data.subarray(topRowStart, topRowStart + rowSize))

    // Copy the bottom row to the top row
    data.copyWithin(topRowStart, bottomRowStart, bottomRowStart + rowSize)

    // Copy the saved top row to the bottom row
    data.set(tempRow, bottomRowStart)
  }

  return imageData
}

const saveImage = async () => {
  const prefs = usePreferenceStore.getState().prefs
  const gl = Application.gl

  const displayLayer = ResourceManager.get("DisplayLayer")

  DrawingManager.pauseDrawNextFrame()
  DrawingManager.clearSpecific(displayLayer)
  DrawingManager.recomposite()
  DrawingManager.render()
  gl.bindFramebuffer(gl.FRAMEBUFFER, displayLayer.bufferInfo.framebuffer)

  const format = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT) as number
  const type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE) as number

  gl.readBuffer(gl.COLOR_ATTACHMENT0)

  const data = new Uint16Array(prefs.canvasWidth * prefs.canvasHeight * 4)
  await readPixelsAsync(gl, 0, 0, prefs.canvasWidth, prefs.canvasHeight, format, type, data)

  // Data is 16 bit float values stored in a uint16 array
  const data8bit = Uint8ClampedArray.from(data, (num) => {
    return uint16ToFloat16(num) * 255
  })

  const imageData = new ImageData(data8bit, prefs.canvasWidth, prefs.canvasHeight)

  flipVertically(imageData)

  const imageBitmap = await createImageBitmap(imageData)
  Application.exportCanvasContext.transferFromImageBitmap(imageBitmap)

  const blob = await Application.exportCanvas.convertToBlob({ type: "image/png", quality: 1.0 })

  if (!blob) {
    console.error("Unable to create blob and save image")
    return
  }

  const fileData = new File([blob], "image.png", { type: "png" })
  const url = URL.createObjectURL(fileData)

  Application.exportDownloadLink.setAttribute("href", url)
  Application.exportDownloadLink.download = "image.png"
  Application.exportDownloadLink.click()

  URL.revokeObjectURL(url)
}

const SliderSetting = (name: string, value: number, _onValueChange: (value: number) => void, props: any) => {
  const onValueChange = (value: number[]) => _onValueChange(value[0]) // Radix UI uses values in arrays to support multiple thumbs
  // const handler = useCallback(throttle(onValueChange, 16), [dependency])

  return (
    <div key={`${name}_setting`} className="flex h-full flex-row items-center justify-center pt-2">
      <div className="flex h-full flex-row items-center justify-center">
        <p className="pr-2 text-sm text-muted-foreground">{name}</p>
        <Slider className="mr-4 w-28" {...props} value={[value]} onValueChange={onValueChange} />
        <p className="mr-2 w-[3ch] text-sm text-muted-foreground">{value.toFixed(2)}</p>
      </div>
    </div>
  )
}

function _TopMenu() {
  const setPrefs = usePreferenceStore.use.setPrefs()
  const prefs = usePreferenceStore.use.prefs()

  return (
    <>
      <Dialog>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem disabled>New</MenubarItem>
              <MenubarItem onClick={() => void saveImage()}>Save Image</MenubarItem>
              <MenubarItem disabled>Exit</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem disabled>Undo</MenubarItem>
              <MenubarItem disabled>Redo</MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => DrawingManager.clearAll()}>Clear All</MenubarItem>
              <MenubarSeparator />
              <MenubarItem disabled>Project Name</MenubarItem>
              <DialogTrigger asChild>
                <MenubarItem>Preferences</MenubarItem>
              </DialogTrigger>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Help</MenubarTrigger>
            <MenubarContent>
              <MenubarItem
                onSelect={() => {
                  localStorage.clear()
                  usePreferenceStore.getState().resetToDefault()
                }}
              >
                Reset Preferences
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preferences</DialogTitle>
            {SliderSetting(
              "Pressure Sensitivity",
              prefs.pressureSensitivity,
              (pressureSensitivity) => setPrefs({ pressureSensitivity }),
              {
                min: 0,
                max: 1,
                step: 0.01,
              },
            )}

            {SliderSetting(
              "Pressure Filtering",
              ((1 - prefs.pressureFiltering) * 10) / 10,
              (pressureFiltering) => setPrefs({ pressureFiltering: 1 - pressureFiltering }),
              {
                min: 0,
                max: 0.99,
                step: 0.01,
              },
            )}

            {SliderSetting(
              "Mouse Filtering",
              ((1 - prefs.mouseFiltering) * 10) / 10,
              (mouseFiltering) => setPrefs({ mouseFiltering: 1 - mouseFiltering }),
              {
                min: 0,
                max: 0.99,
                step: 0.01,
              },
            )}

            {SliderSetting(
              "Mouse Smoothing",
              ((1 - prefs.mouseSmoothing) * 10) / 10,
              (mouseSmoothing) => setPrefs({ mouseSmoothing: 1 - mouseSmoothing }),
              {
                min: 0,
                max: 0.99,
                step: 0.01,
              },
            )}
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}

export const TopMenu = _TopMenu
