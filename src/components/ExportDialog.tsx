import { memo, useCallback, useState } from "react"

import { Application } from "@/managers/ApplicationManager"
import { ResourceManager } from "@/managers/ResourceManager"
import { DrawingManager } from "@/managers/DrawingManager"
import { Button } from "@/components/ui/button"

import { DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"

import { SettingSlider } from "@/components/SettingSlider"

import { readPixelsAsync } from "@/utils/asyncReadback"

import type { ExportImageFormats, IAppExportMessageResponseEvent, IExportConfig, IExportRequest } from "@/types"

import { Input } from "@/components/ui/input"

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getPreference } from "@/stores/PreferenceStore"

const saveImage = async (filename: string, exportFormat: ExportImageFormats, exportQuality: number) => {
  // So next will build properly
  if (typeof window === "undefined") return

  const gl = Application.gl

  const displayLayer = ResourceManager.get("DisplayLayer")

  DrawingManager.clearSpecific(displayLayer)
  DrawingManager.fullyRecomposite()
  DrawingManager.render()
  DrawingManager.pauseDrawNextFrame()
  gl.bindFramebuffer(gl.FRAMEBUFFER, displayLayer.bufferInfo.framebuffer)

  const glReadbackFormat = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT) as number
  const glReadbackType = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE) as number

  gl.readBuffer(gl.COLOR_ATTACHMENT0)

  const data = new (getPreference("colorDepth") === 8 ? Uint8Array : Uint16Array)(
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

  const worker = new Worker(new URL("@/workers/ExportImage.worker.ts", import.meta.url), {
    type: "module",
    name: "export",
  })

  const configRequest: IExportConfig = {
    type: "CONFIG",
    height: Application.canvasInfo.height,
    width: Application.canvasInfo.width,
  }

  worker.postMessage(configRequest)

  const exportRequest: IExportRequest = {
    type: "REQUEST",
    colorDepth: getPreference("colorDepth"),
    exportFormat,
    exportQuality,
    filename,
    pixelBuffer: data.buffer,
  }

  worker.postMessage(exportRequest, [data.buffer])

  worker.onmessage = (event: IAppExportMessageResponseEvent) => {
    const url = event.data.imageURL
    const fullFilename = event.data.fullFilename

    Application.exportDownloadLink.setAttribute("href", url)
    Application.exportDownloadLink.download = fullFilename
    Application.exportDownloadLink.click()

    URL.revokeObjectURL(url)

    worker.terminate()
  }
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
          When clicking save the browser may notify you that an image was downloaded or prompt you may be prompted to
          download the image explicitly.
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
