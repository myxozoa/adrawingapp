import { mat3, vec2 } from "gl-matrix"

import { usePreferenceStore } from "@/stores/PreferenceStore"

import { toClipSpace } from "@/utils"

const one = vec2.fromValues(1, 1)

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

    const initialZoom = 1
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
    vec2.set(this.info.position, value, this.info.position[1])
  }

  get y() {
    return this.info.position[1]
  }

  set y(value: number) {
    vec2.set(this.info.position, this.info.position[0], value)
  }

  public init = (gl: WebGL2RenderingContext) => {
    this.updateViewProjectionMatrix(gl)

    this.fitToView(gl)
  }

  public updateViewMatrix = () => {
    vec2.divide(this.invZoom, one, this.info.zoom)
    mat3.fromTranslation(this.viewMatrix, this.info.position)
    mat3.scale(this.viewMatrix, this.viewMatrix, this.invZoom)
  }

  public updateViewProjectionMatrix = (gl: WebGL2RenderingContext) => {
    mat3.projection(this.viewProjectionMatrix, gl.canvas.width, gl.canvas.height)
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

  public getWorldMousePosition = (position: { x: number; y: number }, gl: WebGL2RenderingContext): vec2 => {
    vec2.transformMat3(
      this.tempVec2,
      toClipSpace(position, gl.canvas as HTMLCanvasElement),
      this.getInverseViewProjectionMatrix(),
    )

    return this.tempVec2
  }

  public fitToView = (gl: WebGL2RenderingContext) => {
    const prefs = usePreferenceStore.getState().prefs

    // Minimum space between canvas edges and screen edges
    // Should be greater than the UI width (TODO: Automate)
    const margin = 50

    // Start with a zoom that allows the whole canvas to be in view
    const widthZoomTarget = gl.canvas.width - margin * 2
    const heightZoomTarget = gl.canvas.height - margin * 2
    Camera.zoom = Math.min(widthZoomTarget / prefs.canvasWidth, heightZoomTarget / prefs.canvasHeight)

    // Start with a camera position that centers the canvas in view
    // TODO: Fix alg
    Camera.x = -Math.max(margin, widthZoomTarget / 2 - (prefs.canvasWidth * Camera.zoom) / 2)
    Camera.y = -Math.max(margin, heightZoomTarget / 2 - (prefs.canvasHeight * Camera.zoom) / 2)

    Camera.updateViewProjectionMatrix(gl)
  }
}

export const Camera = new _Camera()
