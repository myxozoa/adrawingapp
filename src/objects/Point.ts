import type { IPoint, PointerType } from "@/types"
import { vec2 } from "gl-matrix"

export class Point implements IPoint {
  location: vec2
  pressure: number
  pointerType: PointerType
  active: boolean
  id: number

  constructor(values?: Partial<IPoint>) {
    this.active = false
    this.pressure = 0.0
    this.location = vec2.create()
    this.pointerType = "mouse"
    this.id = Math.random() * Math.random()

    if (values) {
      values.location = this.location
      Object.assign(this, values)
    }
  }

  set x(value: number) {
    vec2.set(this.location, value, this.location[1])

    this.id = Math.random() * Math.random()
  }

  get x() {
    return this.location[0]
  }

  set y(value: number) {
    vec2.set(this.location, this.location[0], value)

    this.id = Math.random() * Math.random()
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
    this.id = Math.random() * Math.random()
  }

  public copy = (point: IPoint) => {
    this.x = point.x
    this.y = point.y

    this.pressure = point.pressure
    this.pointerType = point.pointerType
    this.active = point.active
  }
}
