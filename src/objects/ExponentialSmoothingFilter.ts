export class ExponentialSmoothingFilter1D {
  private setting: number
  private smoothedValue: number | null

  constructor(setting: number) {
    this.setting = setting // Alpha is a smoothing factor between 0 and 1
    this.smoothedValue = null
  }

  filter(newValue: number): number {
    if (this.smoothedValue === null) {
      this.smoothedValue = newValue
    } else {
      this.smoothedValue = this.setting * newValue + (1 - this.setting) * this.smoothedValue
    }
    return this.smoothedValue
  }

  changeSetting(newValue: number) {
    this.setting = newValue
  }

  reset() {
    this.smoothedValue = null
  }
}

export class ExponentialSmoothingFilter2D {
  private setting: number
  private smoothedValueX: number | null
  private smoothedValueY: number | null

  constructor(setting: number) {
    this.setting = setting
    this.smoothedValueX = null
    this.smoothedValueX = null
  }

  filter(x: number, y: number): { x: number; y: number } {
    if (this.smoothedValueX === null || this.smoothedValueY === null) {
      this.smoothedValueX = x
      this.smoothedValueY = y
    } else {
      this.smoothedValueX = this.setting * x + (1 - this.setting) * this.smoothedValueX
      this.smoothedValueY = this.setting * y + (1 - this.setting) * this.smoothedValueY
    }
    return { x: this.smoothedValueX, y: this.smoothedValueY }
  }

  changeSetting(newValue: number) {
    this.setting = newValue
  }

  reset() {
    this.smoothedValueX = null
    this.smoothedValueY = null
  }
}
