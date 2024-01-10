import { IPoint, PointerType } from "@/types"
import { vec3 } from "gl-matrix"

export class Point implements IPoint {
  location: vec3
  pressure: number
  pointerType: PointerType
  active: boolean

  constructor(values?: Partial<IPoint>) {
    this.active = false
    this.pressure = 0.5
    this.location = vec3.create()

    if (values) {
      values.location = this.location
      Object.assign(this, values)
    }
  }

  set x(value: number) {
    vec3.set(this.location, value, this.location[1], 0)
  }

  get x() {
    return this.location[0]
  }

  set y(value: number) {
    vec3.set(this.location, this.location[0], value, 0)
  }

  get y() {
    return this.location[1]
  }
}
