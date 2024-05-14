/**  Class designed to filter an arbitrary number of ideally related values at once
 *
 *   Prefer multiple instances for even loosely unrelated data ie mouse position and pressure
 */
export class ExponentialSmoothingFilter {
  public smoothAmount: number
  private smoothedValue: number[]
  private inputArray: number[]
  private initialState: boolean

  constructor(smoothAmount: number, numberOfValues: number) {
    this.smoothAmount = smoothAmount
    this.smoothedValue = new Array<number>(numberOfValues).fill(0)
    this.inputArray = new Array<number>(numberOfValues).fill(0)
    this.initialState = true
  }

  /**
   * Arrays need to be aligned and the same length
   *
   * @example
   * ```
   * const [smoothed] = pressureFilter.filter(interpolatedPoint.pressure)
   * ```
   * */
  public filter(newValues: number[]): number[] {
    for (let index = 0; index < this.smoothedValue.length; index++) {
      if (this.initialState) {
        this.smoothedValue[index] = newValues[index]
      } else {
        this.smoothedValue[index] =
          this.smoothAmount * newValues[index] + (1 - this.smoothAmount) * this.smoothedValue[index]
      }
    }

    return this.smoothedValue
  }

  public changeSetting(smoothBy: number) {
    this.smoothAmount = smoothBy
  }

  public getInputArray() {
    return this.inputArray
  }

  /**  Resets all values at once */
  public reset() {
    this.initialState = true
  }
}
