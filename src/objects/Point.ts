import type { IPoint, PointerType } from "@/types"
import { vec2 } from "gl-matrix"

export class Point implements IPoint {
  location: vec2
  _pressure: Float32Array
  pointerType: PointerType
  active: boolean
  id: number

  constructor(values?: Partial<IPoint>) {
    this.active = false
    this._pressure = new Float32Array(1)
    this.location = vec2.create()
    this.pointerType = "mouse"
    this.id = Math.fround(Math.random() * Math.random())

    if (values) {
      values.location = this.location
      Object.assign(this, values)
    }
  }

  set pressure(value: number) {
    this._pressure[0] = value
  }

  get pressure() {
    return this._pressure[0]
  }

  set x(value: number) {
    vec2.set(this.location, value, this.location[1])

    this.id = Math.fround(Math.random() * Math.random())
  }

  get x() {
    return this.location[0]
  }

  set y(value: number) {
    vec2.set(this.location, this.location[0], value)

    this.id = Math.fround(Math.random() * Math.random())
  }

  get y() {
    return this.location[1]
  }

  public reset = () => {
    vec2.zero(this.location)

    this.pressure = 0.5
    this.pointerType = "mouse"
    this.active = false
    this.id = Math.fround(Math.random() * Math.random())
  }

  public copy = (point: IPoint) => {
    this.x = point.x
    this.y = point.y

    this.pressure = point.pressure
    this.pointerType = point.pointerType
    this.active = point.active
  }
}
