import { IPoint, PointerType } from "@/types"
import { vec3 } from "gl-matrix"

export class Point implements IPoint {
  location: vec3
  pressure: number
  pointerType: PointerType

  constructor(values: Partial<IPoint>) {
    delete values.location

    this.location = vec3.create()
    Object.assign(this, values)
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
