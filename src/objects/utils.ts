export class LocationStorage {
  location: Float32Array
  obj: { x: number; y: number }

  constructor() {
    this.location = new Float32Array(2).fill(0)
  }

  set x(value: number) {
    this.location[0] = value
  }

  get x() {
    return this.location[0]
  }

  set y(value: number) {
    this.location[1] = value
  }

  get y() {
    return this.location[1]
  }

  toString() {
    return `x: ${this.location[0]}, y: ${this.location[1]}`
  }
}
