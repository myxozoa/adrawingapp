import { flipVertically, uint16ToFloat16 } from "@/utils/sharedUtils"

import type { IAppMessageConfigEvent, IAppMessageRequestEvent, IThumbnailResponse } from "@/types"

// Without this typescript thinks postMessage is window.postMessage which has a different signature
const worker: Worker = self as unknown as Worker

const thumbnailCanvas = new OffscreenCanvas(50, 50)
const thumbnailCanvasContext = thumbnailCanvas.getContext("bitmaprenderer")!

if (!thumbnailCanvasContext) throw new Error("unable to get thumbnailcanvas context")

const thumbnailSize = {
  width: 50,
  height: 50,
}

function isRequest(event: IAppMessageRequestEvent | IAppMessageConfigEvent): event is IAppMessageRequestEvent {
  return event.data.type === "REQUEST"
}

function isConfig(event: IAppMessageRequestEvent | IAppMessageConfigEvent): event is IAppMessageConfigEvent {
  return event.data.type === "CONFIG"
}

function onMessage(event: IAppMessageRequestEvent | IAppMessageConfigEvent) {
  // Cant seem to get a switch statement to narrow the type properly here
  if (isRequest(event)) createThumbnail(event)
  if (isConfig(event)) config(event)
}

function config(event: IAppMessageConfigEvent) {
  thumbnailSize.width = event.data.thumbnailWidth
  thumbnailSize.height = event.data.thumbnailHeight

  thumbnailCanvas.width = thumbnailSize.width
  thumbnailCanvas.height = thumbnailSize.height
}

function createThumbnail(event: IAppMessageRequestEvent) {
  const pixelBuffer = event.data.pixelBuffer
  const colorDepth = event.data.colorDepth
  const layerID = event.data.layerID

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

  const imageData = new ImageData(data8bit, thumbnailSize.width, thumbnailSize.height)

  flipVertically(imageData)

  void (async () => {
    const imageBitmap = await createImageBitmap(imageData)
    thumbnailCanvasContext.transferFromImageBitmap(imageBitmap)

    const blob = await thumbnailCanvas.convertToBlob({ type: "image/png", quality: 1.0 })

    const opfsRoot = await navigator.storage.getDirectory()

    const thumbnailFileHandle = await opfsRoot.getFileHandle(`thumbnail_${layerID}.png`, { create: true })

    try {
      const writable = await thumbnailFileHandle.createWritable()
      await writable.write(blob)
      await writable.close()
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      log(`ERROR ${error}`)
    }

    const file = await thumbnailFileHandle.getFile()
    const imageURL = URL.createObjectURL(file)

    const response: IThumbnailResponse = {
      type: "COMPLETE",
      pixelBuffer: event.data.pixelBuffer,
      imageURL,
      layerID,
    }

    worker.postMessage(response, [event.data.pixelBuffer])
  })()
}

function log(msg: string) {
  worker.postMessage({ type: "DEBUG_LOG", msg })
}

self.onmessage = onMessage
