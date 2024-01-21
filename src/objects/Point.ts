import { IPoint, PointerType } from "@/types"
import { vec2 } from "gl-matrix"

export class Point implements IPoint {
  location: vec2
  pressure: number
  pointerType: PointerType
  active: boolean

  constructor(values?: Partial<IPoint>) {
    this.active = false
    this.pressure = 0.5
    this.location = vec2.create()
    this.pointerType = "mouse"

    if (values) {
      values.location = this.location
      Object.assign(this, values)
    }
  }

  set x(value: number) {
    vec2.set(this.location, value, this.location[1])
  }

  get x() {
    return this.location[0]
  }

  set y(value: number) {
    vec2.set(this.location, this.location[0], value)
  }

  get y() {
    return this.location[1]
  }

  public reset = () => {
    this.location[0] = 0
    this.location[1] = 0
    this.location[2] = 0

    this.pressure = 0.5
    this.pointerType = "mouse"
    this.active = false
  }
}
