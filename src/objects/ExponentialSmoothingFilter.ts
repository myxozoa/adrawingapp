/**  Class designed to filter an arbitrary number of ideally related values at once
 *
 *   Prefer multiple instances for even loosely unrelated data ie mouse position and pressure
 */
export class ExponentialSmoothingFilter {
  public smoothAmount: number
  private smoothedValue: Float32Array
  private inputArray: Float32Array
  private initialState: boolean

  constructor(smoothAmount: number, numberOfValues: number) {
    this.smoothAmount = smoothAmount
    this.smoothedValue = new Float32Array(numberOfValues).fill(0)
    this.inputArray = new Float32Array(numberOfValues).fill(0)
    this.initialState = true
  }

  /**
   * Takes Float32Array that need to be aligned and the same length, use the inputArray provided
   *
   * @example
   * ```
   * const [smoothed] = pressureFilter.filter(interpolatedPoint.pressure)
   * ```
   * */
  public filter(newValues: Float32Array): Float32Array {
    for (let index = 0; index < this.smoothedValue.length; index++) {
      if (this.initialState) {
        this.smoothedValue[index] = newValues[index]
        this.initialState = false
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
