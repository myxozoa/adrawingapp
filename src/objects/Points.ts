import { Point } from "@/objects/Point"
import { IPoint, IPoints } from "@/types"

export class Points implements IPoints {
  list: IPoint[]
  currentPointIndex: number // always % points.length

  constructor(amount: number) {
    this.list = Array.apply(0, new Array(amount)).map(() => new Point())
    this.currentPointIndex = 0
  }

  get length() {
    return this.list.length
  }

  get currentPoint(): IPoint {
    return this.list[this.currentPointIndex]
  }

  set currentPoint(point: IPoint) {
    this.list[this.currentPointIndex] = point
  }

  private goTo = (index: number) => {
    this.currentPointIndex = index
  }

  private moveIndex = (offset: number) => {
    this.currentPointIndex = (this.currentPointIndex + this.list.length + offset) % this.list.length
  }

  public reset = () => {
    this.list.forEach((point) => {
      point.reset()
    })
  }

  public at = (index: number) => {
    return this.list.at(index)
  }

  public getPoint = (index: number) => {
    return this.list[(this.currentPointIndex + this.list.length + index) % this.list.length]!
  }

  public updatePoint = (index: number, newInfo: Partial<IPoint>, x?: number, y?: number) => {
    if (newInfo.location) throw Error("Dont add location to updatePoint")
    Object.assign(this.list[index], newInfo)

    if (x) this.list[index].x = x
    if (y) this.list[index].y = y
  }

  public updateCurrentPoint = (newInfo: Partial<IPoint>, x?: number, y?: number) => {
    this.updatePoint(this.currentPointIndex, newInfo, x, y)
  }

  public nextPoint = () => {
    this.moveIndex(1)
  }

  public prevPoint = () => {
    this.moveIndex(-1)
  }
}
