import { memo, useCallback, useState } from "react"

import { Application } from "@/managers/ApplicationManager"
import { ResourceManager } from "@/managers/ResourceManager"
import { DrawingManager } from "@/managers/DrawingManager"
import { Button } from "@/components/ui/button"

import { DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"

import { SettingSlider } from "@/components/SettingSlider"

import { readPixelsAsync } from "@/utils/asyncReadback"

import { getMIMEFromImageExtension, uint16ToFloat16 } from "@/utils/utils"

import type { ExportImageFormats } from "@/types"

import { Input } from "@/components/ui/input"

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getPreference } from "@/stores/PreferenceStore"

export function flipVertically(imageData: ImageData) {
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
  const gl = Application.gl
  const colorDepth = getPreference("colorDepth")

  const displayLayer = ResourceManager.get("DisplayLayer")

  DrawingManager.clearSpecific(displayLayer)
  DrawingManager.fullyRecomposite()
  DrawingManager.render()
  DrawingManager.pauseDrawNextFrame()
  gl.bindFramebuffer(gl.FRAMEBUFFER, displayLayer.bufferInfo.framebuffer)

  const glReadbackFormat = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT) as number
  const glReadbackType = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE) as number

  gl.readBuffer(gl.COLOR_ATTACHMENT0)

  const data = new (colorDepth === 8 ? Uint8Array : Uint16Array)(
    Application.canvasInfo.width * Application.canvasInfo.height * 4,
  )
  await readPixelsAsync(
    gl,
    0,
    0,
    Application.canvasInfo.width,
    Application.canvasInfo.height,
    glReadbackFormat,
    glReadbackType,
    data,
  )

  queueMicrotask(() => {
    const data8bit = Uint8ClampedArray.from(data, (num) => {
      if (colorDepth === 8) return num

      return uint16ToFloat16(num)
    })

    for (let i = 0; i < data8bit.length; i += 4) {
      const alpha = colorDepth === 8 ? data8bit[i + 3] / 255 : data8bit[i + 3]

      data8bit[i] /= alpha
      data8bit[i + 1] /= alpha
      data8bit[i + 2] /= alpha

      if (colorDepth === 16) {
        data8bit[i] *= 255
        data8bit[i + 1] *= 255
        data8bit[i + 2] *= 255
        data8bit[i + 3] *= 255
      }
    }

    const imageData = new ImageData(data8bit, Application.canvasInfo.width, Application.canvasInfo.height)

    queueMicrotask(() => {
      flipVertically(imageData)
    })

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    queueMicrotask(async () => {
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
    })
  })
}

function _ExportDialog() {
  const [quality, setQuality] = useState(1)
  const [filename, setFilename] = useState("New Image")
  const [format, setFormat] = useState(Application.supportedExportImageFormats[0]) // PNG is always supported

  const handleFormat = useCallback((value: string) => setFormat(value as ExportImageFormats), [])

  const renderFormats = useCallback(
    (imageFormat: string, index: number) => (
      <SelectItem key={`exportFormat${index}`} value={imageFormat}>
        .{imageFormat.toUpperCase()}
      </SelectItem>
    ),
    [],
  )

  const handleQuality = useCallback((value: number) => setQuality(value), [])

  const handleSave = useCallback(() => void saveImage(filename, format, quality), [filename, format, quality])

  return (
    <>
      <DialogHeader>
        <DialogTitle>Save Image</DialogTitle>
        <DialogDescription>
          This is quite slow at the moment so the page may become unresponsive for a few seconds depending on your
          hardware and the canvas size. Improvement coming soon.
        </DialogDescription>
      </DialogHeader>

      <div className="!mt-4 flex flex-col items-center justify-between sm:flex-row">
        <div className="mt-2 flex w-fit flex-row sm:mt-0">
          <Input
            name="Export File Name"
            id="export_file_name"
            type="string"
            className="w-[15ch] rounded-r-none"
            placeholder="Your Filename"
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
          />
          <Select defaultValue={format} onValueChange={handleFormat}>
            <SelectTrigger className="rounded-l-none pl-4">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>{Application.supportedExportImageFormats.map(renderFormats)}</SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <SettingSlider
          name={"Quality"}
          value={quality}
          onValueChange={handleQuality}
          fractionDigits={1}
          min={0}
          max={1}
          step={0.1}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" className="!mt-4" onClick={handleSave}>
          Save Image
        </Button>
      </DialogFooter>
    </>
  )
}

export const ExportDialog = memo(_ExportDialog)
