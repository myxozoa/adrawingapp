import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
  MenubarSeparator,
} from "@/components/ui/menubar"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { DrawingManager } from "@/managers/drawingManager"
import { Slider } from "@/components/ui/slider"
import { usePreferenceStore } from "@/stores/PreferenceStore"

const saveImage = async () => {
  const prefs = usePreferenceStore.getState().prefs
  const gl = DrawingManager.gl

  DrawingManager.renderToScreen()
  gl.bindFramebuffer(gl.FRAMEBUFFER, DrawingManager.renderBufferInfo.framebuffer)

  const downloadLink = document.createElementNS("http://www.w3.org/1999/xhtml", "a") as HTMLAnchorElement

  const canvas = document.createElement("canvas")
  canvas.width = prefs.canvasWidth
  canvas.height = prefs.canvasHeight
  const context = canvas.getContext("bitmaprenderer")!

  const format = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT) as number
  const type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE) as number

  const data = new Float32Array(prefs.canvasWidth * prefs.canvasHeight * 4)
  gl.readPixels(0, 0, prefs.canvasWidth, prefs.canvasHeight, format, type, data)

  const data8Bit = Uint8ClampedArray.from(data)

  const imageData = new ImageData(prefs.canvasWidth, prefs.canvasHeight)
  imageData.data.set(data8Bit)

  const imageBitmap = await createImageBitmap(imageData)
  context.transferFromImageBitmap(imageBitmap)

  console.log(imageData)

  canvas.toBlob(
    function (blob) {
      if (!blob) {
        console.error("Unable to create blob and save image")
        return
      }

      const data = new File([blob], "image.png", { type: "png" })
      const url = URL.createObjectURL(data)

      downloadLink.id = "local_filesaver"
      downloadLink.download = "image.png"
      downloadLink.target = "_blank"
      downloadLink.rel = "noopener"
      downloadLink.style.display = "none"
      document.body.appendChild(downloadLink)

      downloadLink.setAttribute("href", url)

      downloadLink.click()

      URL.revokeObjectURL(url)
      document.body.removeChild(downloadLink)
    },
    "image/png",
    1.0,
  )

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  canvas.remove()
  downloadLink.remove()
}

const SliderSetting = (name: string, value: number, _onValueChange: (value: number) => void, props: any) => {
  const onValueChange = (value: number[]) => _onValueChange(value[0]) // Radix UI uses values in arrays to support multiple thumbs
  // const handler = useCallback(throttle(onValueChange, 16), [dependency])

  return (
    <div key={`${name}_setting`} className="flex h-full flex-row items-center justify-center pt-2">
      <div className="flex h-full flex-row items-center justify-center">
        <p className="pr-2 text-sm text-muted-foreground">{name}</p>
        <Slider className="mr-4 w-28" {...props} value={[value]} onValueChange={onValueChange} />
        <p className="mr-2 w-[3ch] text-sm text-muted-foreground">{value}</p>
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
              <MenubarItem onClick={saveImage}>Save Image</MenubarItem>
              <MenubarItem disabled>Exit</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem disabled>Undo</MenubarItem>
              <MenubarItem disabled>Redo</MenubarItem>
              <MenubarSeparator />
              <MenubarItem disabled>Project Name</MenubarItem>
              <DialogTrigger asChild>
                <MenubarItem>Preferences</MenubarItem>
              </DialogTrigger>
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
                step: 0.1,
              },
            )}

            {SliderSetting(
              "Pressure Filtering",
              Math.round((1 - prefs.pressureFiltering) * 10) / 10,
              (pressureFiltering) => setPrefs({ pressureFiltering: 1 - pressureFiltering }),
              {
                min: 0,
                max: 0.9,
                step: 0.1,
              },
            )}

            {SliderSetting(
              "Mouse Filtering",
              Math.round((1 - prefs.mouseFiltering) * 10) / 10,
              (mouseFiltering) => setPrefs({ mouseFiltering: 1 - mouseFiltering }),
              {
                min: 0,
                max: 0.9,
                step: 0.1,
              },
            )}

            {SliderSetting(
              "Mouse Smoothing",
              Math.round((1 - prefs.mouseSmoothing) * 10) / 10,
              (mouseSmoothing) => setPrefs({ mouseSmoothing: 1 - mouseSmoothing }),
              {
                min: 0,
                max: 0.9,
                step: 0.1,
              },
            )}
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}

export const TopMenu = _TopMenu
