import { useState } from "react"

import { Application } from "@/managers/ApplicationManager"
import { ResourceManager } from "@/managers/ResourceManager"
import { usePreferenceStore } from "@/stores/PreferenceStore"
import { DrawingManager } from "@/managers/DrawingManager"
import { Button } from "@/components/ui/button"

import { DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { SettingSlider } from "@/components/SettingSlider"

import { readPixelsAsync } from "@/utils/asyncReadback"

import { getMIMEFromImageExtension, uint16ToFloat16 } from "@/utils/utils"

import type { ExportImageFormats } from "@/types"

import { Input } from "@/components/ui/input"

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

const saveImage = async (filename: string, exportFormat: ExportImageFormats, exportQuality: number) => {
  const prefs = usePreferenceStore.getState().prefs
  const gl = Application.gl

  const displayLayer = ResourceManager.get("DisplayLayer")

  DrawingManager.pauseDrawNextFrame()
  DrawingManager.clearSpecific(displayLayer)
  DrawingManager.recomposite()
  DrawingManager.render()
  gl.bindFramebuffer(gl.FRAMEBUFFER, displayLayer.bufferInfo.framebuffer)

  const glReadbackFormat = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT) as number
  const glReadbackType = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE) as number

  gl.readBuffer(gl.COLOR_ATTACHMENT0)

  const data = new Uint16Array(prefs.canvasWidth * prefs.canvasHeight * 4)
  await readPixelsAsync(gl, 0, 0, prefs.canvasWidth, prefs.canvasHeight, glReadbackFormat, glReadbackType, data)

  // Data is 16 bit float values stored in a uint16 array
  const data8bit = Uint8ClampedArray.from(data, (num) => {
    return uint16ToFloat16(num) * 255
  })

  const imageData = new ImageData(data8bit, prefs.canvasWidth, prefs.canvasHeight)

  flipVertically(imageData)

  const imageBitmap = await createImageBitmap(imageData)
  Application.exportCanvasContext.transferFromImageBitmap(imageBitmap)

  const exportFormatMIME = getMIMEFromImageExtension(exportFormat)

  const blob = await Application.exportCanvas.convertToBlob({ type: exportFormatMIME, quality: exportQuality })

  if (!blob) {
    console.error("Unable to create blob and save image")
    return
  }

  const fullFilename = `${filename}.${exportFormat}`

  const fileData = new File([blob], fullFilename, { type: exportFormatMIME })
  const url = URL.createObjectURL(fileData)

  Application.exportDownloadLink.setAttribute("href", url)
  Application.exportDownloadLink.download = fullFilename
  Application.exportDownloadLink.click()

  URL.revokeObjectURL(url)
}

export function ExportDialog() {
  const [quality, setQuality] = useState(1)
  const [filename, setFilename] = useState("New Image")
  const [format, setFormat] = useState(Application.supportedExportImageFormats[0]) // PNG is always supported

  return (
    <DialogHeader>
      <DialogTitle>Save Image</DialogTitle>
      <div className="!mt-4 flex flex-col items-center justify-between sm:flex-row">
        {SettingSlider("Quality", quality, (value) => setQuality(value), 1, { min: 0, max: 1, step: 0.1 })}

        <div className="mt-2 flex w-fit flex-row sm:mt-0">
          <Input
            type="string"
            className="w-[15ch]"
            placeholder="Your Filename"
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
          />
          <p className="mx-3 pt-2">.</p>
          <Select defaultValue={format} onValueChange={(value) => setFormat(value as ExportImageFormats)}>
            <SelectTrigger>
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Application.supportedExportImageFormats.map((imageFormat, index) => (
                  <SelectItem key={`exportFormat${index}`} value={imageFormat}>
                    {imageFormat.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button variant="outline" size="sm" className="!mt-4" onClick={() => void saveImage(filename, format, quality)}>
        Save Image
      </Button>
    </DialogHeader>
  )
}
