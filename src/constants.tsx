export const tool_list = {
  PEN: "PEN",
  BRUSH: "BRUSH",
  ERASER: "ERASE",
  CURVES: "CURVE"
}

function getCanvasColor(opacity: boolean, fullyTransparent: boolean) {
  const useOpacity = opacity ? (this.opacity / 100).toFixed(2) : 1
  const transparent = fullyTransparent ? 0.0 : useOpacity
  return `rgba(${this.color[0]},${this.color[1]},${this.color[2]}, ${transparent})`
}

export const tools = {
  [tool_list.PEN]: {name: tool_list.PEN, size: 10, color: [255, 0, 0], opacity: 100, getCanvasColor },
  [tool_list.BRUSH]: {name: tool_list.BRUSH, size: 10, color: [255, 0, 0], opacity: 100, getCanvasColor, image: null },
  [tool_list.ERASER]: {name: tool_list.ERASER, size: 20, color: [0, 0, 0], opacity: 100, getCanvasColor, image: null },
  [tool_list.CURVES]: {name: tool_list.CURVES}
}

export const blend_modes = {
  normal: "normal",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  darken: "darken",
  lighten: "lighten",
  colorDodge: "color-dodge",
  colorBurn: "color-burn",
  hardLight: "hard-light",
  softLight: "soft-light",
  difference: "difference",
  exclusion: "exclusion",
  hue: "hue",
  saturation: "saturation",
  color: "color",
  luminosity: "luminosity",
}

export const key_modifers = {
  ctrl: 'ctrl',
  alt: 'alt',
  shift: 'shift'
}