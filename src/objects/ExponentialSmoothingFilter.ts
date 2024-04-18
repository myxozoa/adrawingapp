/**  Class designed to filter an arbitrary number of ideally related values at once
 *
 *   Prefer multiple instances for even loosely unrelated data ie mouse position and pressure
 */
export class ExponentialSmoothingFilter {
  public smoothAmount: number
  private smoothedValue: number[]

  constructor(smoothAmount: number) {
    this.smoothAmount = smoothAmount
    this.smoothedValue = []
  }

  /**
   * Arrays need to be aligned and the same length
   *
   * @remarks
   * If the provided newValues array length does not match the internal smoothedValue array, smoothedValue will be overwritten
   *
   * This may be changed in the future if I think of a less lazy way of doing this
   *
   * @example
   * ```
   * const [smoothed] = pressureFilter.filter(interpolatedPoint.pressure)
   * ```
   * */
  public filter(...newValues: number[]): number[] {
    if (this.smoothedValue.length !== newValues.length) this.smoothedValue = newValues

    for (let index = 0; index < this.smoothedValue.length; index++) {
      this.smoothedValue[index] =
        this.smoothAmount * newValues[index] + (1 - this.smoothAmount) * this.smoothedValue[index]
    }

    return this.smoothedValue
  }

  public changeSetting(newValues: number) {
    this.smoothAmount = newValues
  }

  /**  Resets all values at once */
  public reset() {
    this.smoothedValue = []
  }
}
