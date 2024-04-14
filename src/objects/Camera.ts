import { mat3, vec2 } from "gl-matrix"

import { toClipSpace } from "@/utils"

const one = vec2.fromValues(1, 1)

class _Camera {
  public viewMatrix: mat3
  public viewProjectionMatrix: mat3
  private inverseViewProjectionMatrix: mat3
  private tempMat3: mat3
  private tempVec2: vec2
  private invZoom: vec2
  private gl: WebGL2RenderingContext
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

    this.updateViewProjectionMatrix(this.gl)
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
    this.gl = gl
    this.updateViewProjectionMatrix(gl)
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

  public getWorldMousePosition = (position: { x: number; y: number }, gl: WebGL2RenderingContext): [number, number] => {
    vec2.transformMat3(
      this.tempVec2,
      toClipSpace(position, gl.canvas as HTMLCanvasElement),
      this.getInverseViewProjectionMatrix(),
    )

    return this.tempVec2
  }
}

export const Camera = new _Camera()
