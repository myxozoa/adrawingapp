import { getLayer } from "@/stores/LayerStore"
import { getPreference } from "@/stores/PreferenceStore"
import type { IAppThumbnailMessageDebugLogEvent, LayerID } from "@/types"
import type {
  IAppThumbnailMessageResponseEvent,
  IThumbnailConfig,
  IThumbnailRequest,
  IThumbnailResponse,
} from "@/types"

export class ThumbnailController {
  worker: Worker
  thumbnailsToProcess: Map<string, (response: IThumbnailResponse) => void>

  constructor() {
    // next wont build without this
    if (typeof window === "undefined") return

    this.worker = new Worker(new URL("@/workers/Thumbnail.worker.ts", import.meta.url), {
      type: "module",
      name: "thumbnail",
    })
    this.thumbnailsToProcess = new Map()
    this.worker.onmessage = this.onMessage.bind(this)
  }

  onMessage(event: IAppThumbnailMessageResponseEvent | IAppThumbnailMessageDebugLogEvent) {
    // To allow console.log inside worker on iOS
    if (event.data.type === "DEBUG_LOG") {
      console.log(event.data.msg)
      return
    }

    const id = event.data.layerID

    const thing = this.thumbnailsToProcess.get(id)
    if (!thing) return

    const newBuffer = new (getPreference("colorDepth") === 8 ? Uint8Array : Uint16Array)(event.data.pixelBuffer)

    getLayer(id).thumbnailBuffer = newBuffer

    thing.call(this, event.data)

    this.thumbnailsToProcess.delete(id)
  }

  config(thumbnailSize: { width: number; height: number }) {
    const thumbnailConfigMessage: IThumbnailConfig = {
      type: "CONFIG",
      thumbnailHeight: thumbnailSize.height,
      thumbnailWidth: thumbnailSize.width,
    }

    this.worker.postMessage(thumbnailConfigMessage)
  }

  getNewThumbnail(pixelBuffer: ArrayBuffer, colorDepth: 8 | 16, layerID: LayerID) {
    return new Promise<IThumbnailResponse>((resolve) => {
      const message: IThumbnailRequest = {
        type: "REQUEST",
        pixelBuffer,
        colorDepth,
        layerID,
      }

      this.worker.postMessage(message, [pixelBuffer])

      this.thumbnailsToProcess.set(layerID, (response: IThumbnailResponse) => {
        resolve(response)
      })
    })
  }
}
