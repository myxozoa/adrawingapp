import { mat3, vec2 } from "gl-matrix"

import { AppViewportSizeCache, toClipSpace } from "@/utils/utils"
import { Application } from "@/managers/ApplicationManager"

const one = vec2.fromValues(1, 1)
const initialZoom = 1

class _Camera {
  public viewMatrix: mat3
  public viewProjectionMatrix: mat3
  private inverseViewProjectionMatrix: mat3
  private tempMat3: mat3
  private tempVec2: vec2
  private invZoom: vec2
  public info: {
    position: vec2
    zoom: vec2
  }

  constructor() {
    this.viewMatrix = mat3.create()
    this.viewProjectionMatrix = mat3.create()
    this.inverseViewProjectionMatrix = mat3.create()
    this.tempMat3 = mat3.create()
    this.invZoom = vec2.create()
    this.tempVec2 = vec2.create()

    this.info = {
      zoom: vec2.fromValues(initialZoom, initialZoom),
      position: vec2.fromValues(0, 0),
    }
  }

  get zoom() {
    return this.info.zoom[0]
  }

  set zoom(value: number) {
    vec2.set(this.info.zoom, value, value)
  }

  get x() {
    return this.info.position[0]
  }

  set x(value: number) {
    this.info.position[0] = value
  }

  get y() {
    return this.info.position[1]
  }

  set y(value: number) {
    this.info.position[1] = value
  }

  public init = () => {
    this.updateViewProjectionMatrix()

    this.fitToView()
  }

  public updateViewMatrix = () => {
    vec2.divide(this.invZoom, one, this.info.zoom)
    mat3.fromTranslation(this.viewMatrix, this.info.position)
    mat3.scale(this.viewMatrix, this.viewMatrix, this.invZoom)
  }

  public updateViewProjectionMatrix = () => {
    mat3.projection(this.viewProjectionMatrix, AppViewportSizeCache.width, AppViewportSizeCache.height)
    this.updateViewMatrix()
    mat3.invert(this.tempMat3, this.viewMatrix)
    mat3.multiply(this.viewProjectionMatrix, this.viewProjectionMatrix, this.tempMat3)

    mat3.invert(this.inverseViewProjectionMatrix, this.viewProjectionMatrix)
  }

  public project = (matrix: mat3) => {
    return mat3.multiply(this.tempMat3, this.viewProjectionMatrix, matrix)
  }

  public getInverseViewProjectionMatrix = () => {
    return this.inverseViewProjectionMatrix
  }

  public getWorldPosition = (position: { x: number; y: number }): vec2 => {
    vec2.transformMat3(this.tempVec2, toClipSpace(position), this.getInverseViewProjectionMatrix())

    return this.tempVec2
  }

  public fitToView = () => {
    // Minimum space between canvas edges and screen edges
    const topBottomMargin = (Application.canvasInfo.height / 100) * 4
    const sideMargin = (Application.canvasInfo.width / 100) * 4

    // Start with a zoom that allows the whole canvas to be in view
    const widthZoomTarget = AppViewportSizeCache.width - sideMargin * 2
    const heightZoomTarget = AppViewportSizeCache.height - topBottomMargin * 2
    Camera.zoom = Math.min(
      widthZoomTarget / Application.canvasInfo.width,
      heightZoomTarget / Application.canvasInfo.height,
    )

    Camera.updateViewProjectionMatrix()

    const screenMiddle = {
      x: AppViewportSizeCache.width / 2,
      y: AppViewportSizeCache.height / 2,
    }

    const screenMiddleWorldPosition = this.getWorldPosition(screenMiddle)

    // Start with a camera position that centers the canvas in view
    Camera.x = -(sideMargin + screenMiddleWorldPosition[0] - Application.canvasInfo.width / 2)
    Camera.y = -(topBottomMargin + screenMiddleWorldPosition[1] - Application.canvasInfo.height / 2)

    Camera.updateViewProjectionMatrix()
  }

  public reset = () => {
    this.zoom = initialZoom
    this.x = 0
    this.y = 0
    this.updateViewProjectionMatrix()
  }
}

export const Camera = new _Camera()

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  // @ts-expect-error Adding camera global for debugging purposes
  window.__Camera = Camera
}
