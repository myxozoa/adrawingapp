import { type HexColor, type ColorValue, type ColorArray, type Maybe, type ColorValueString } from "@/types"

/**
 * Parse hex color to rgb color array
 *
 */
export function hexToRgb(hex: HexColor): Maybe<ColorArray> {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : undefined
}

/**
 * Number to hex with 1 left padding
 */
export function componentToHex(color: ColorValue): ColorValueString {
  const hex = color.toString(16)
  return hex.length == 1 ? "0" + hex : hex
}

/**
 * Translates array of 8bit rgb colors to hex
 *
 * @returns css style `#FFFFFF` color
 */
export function rgbToHex(color: ColorArray): HexColor {
  return "#" + componentToHex(color[0]) + componentToHex(color[1]) + componentToHex(color[2])
}

export function sRGBToLinear(sRGB: number) {
  return sRGB <= 0.04045 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4)
}

export function linearTosRGB(linearRGB: number) {
  return linearRGB <= 0.0031308 ? linearRGB * 12.92 : 1.055 * Math.pow(linearRGB, 1 / 2.4) - 0.055
}

// https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately/35363027#35363027

/**
 * @example
 * ```
 *  const { r, g, b } = HSVtoRGB(hsvState.hue / 360, saturationPercentage, 1 - valuePercentage)
 * ```
 */
export function HSVtoRGB(h: number, s: number, v: number) {
  let r = 0
  let g = 0
  let b = 0

  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  switch (i % 6) {
    case 0:
      ;(r = v), (g = t), (b = p)
      break
    case 1:
      ;(r = q), (g = v), (b = p)
      break
    case 2:
      ;(r = p), (g = v), (b = t)
      break
    case 3:
      ;(r = p), (g = q), (b = v)
      break
    case 4:
      ;(r = t), (g = p), (b = v)
      break
    case 5:
      ;(r = v), (g = p), (b = q)
      break
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

export function RGBtoHSV(r: number, g: number, b: number) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max / 255

  switch (max) {
    case min:
      h = 0
      break
    case r:
      h = g - b + d * (g < b ? 6 : 0)
      h /= 6 * d
      break
    case g:
      h = b - r + d * 2
      h /= 6 * d
      break
    case b:
      h = r - g + d * 4
      h /= 6 * d
      break
  }

  return {
    h: h,
    s: s,
    v: v,
  }
}

/**
 * Translates array of 8bit rgb colors to rgba
 *
 * @returns css style `rgba()` string
 */
export const getCanvasColor = function (color: ColorArray, opacity?: number) {
  const useOpacity = opacity !== undefined ? (opacity / 100).toFixed(2) : 1
  return `rgba(${color[0]},${color[1]},${color[2]}, ${useOpacity})`
}
