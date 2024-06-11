import { flipVertically, getMIMEFromImageExtension, uint16ToFloat16 } from "@/utils/sharedUtils"

import type { IAppExportMessageConfigEvent, IAppExportMessageRequestEvent, IExportResponse } from "@/types"

// Without this typescript thinks postMessage is window.postMessage which has a different signature
const worker: Worker = self as unknown as Worker

const canvas = new OffscreenCanvas(500, 500)
const canvasContext = canvas.getContext("bitmaprenderer")!

if (!canvasContext) throw new Error("unable to get thumbnailcanvas context")

const imageSize = {
  width: 500,
  height: 500,
}

function isRequest(
  event: IAppExportMessageRequestEvent | IAppExportMessageConfigEvent,
): event is IAppExportMessageRequestEvent {
  return event.data.type === "REQUEST"
}

function isConfig(
  event: IAppExportMessageRequestEvent | IAppExportMessageConfigEvent,
): event is IAppExportMessageConfigEvent {
  return event.data.type === "CONFIG"
}

function onMessage(event: IAppExportMessageRequestEvent | IAppExportMessageConfigEvent) {
  // Cant seem to get a switch statement to narrow the type properly here
  if (isRequest(event)) createImage(event)
  if (isConfig(event)) config(event)
}

function config(event: IAppExportMessageConfigEvent) {
  console.log(imageSize)
  imageSize.width = event.data.width
  imageSize.height = event.data.height

  canvas.width = imageSize.width
  canvas.height = imageSize.height
}

function createImage(event: IAppExportMessageRequestEvent) {
  const pixelBuffer = event.data.pixelBuffer
  const colorDepth = event.data.colorDepth
  const exportFormat = event.data.exportFormat
  const exportQuality = event.data.exportQuality
  const filename = event.data.filename

  const data8bit = new Uint8ClampedArray(pixelBuffer).map((num) => {
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

  const imageData = new ImageData(data8bit, imageSize.width, imageSize.height)

  flipVertically(imageData)

  void (async () => {
    const imageBitmap = await createImageBitmap(imageData)
    canvasContext.transferFromImageBitmap(imageBitmap)

    const exportFormatMIME = getMIMEFromImageExtension(exportFormat)

    const blob = await canvas.convertToBlob({ type: exportFormatMIME, quality: exportQuality })

    if (!blob) {
      console.error("Unable to create blob and save image")
      return
    }

    const fullFilename = `${filename}.${exportFormat}`

    const fileData = new File([blob], fullFilename, { type: exportFormatMIME })
    const imageURL = URL.createObjectURL(fileData)

    const response: IExportResponse = {
      type: "COMPLETE",
      fullFilename,
      imageURL,
    }

    worker.postMessage(response)
  })()
}

// iOS compatible console.log inside worker
// function log(msg: string) {
//   worker.postMessage({ type: "DEBUG_LOG", msg })
// }

self.onmessage = onMessage
