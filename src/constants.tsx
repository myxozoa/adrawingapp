import { BlendModes, Modifier, Tool, ToolName } from "./types"

export const tool_list: Record<ToolName, ToolName> = {
  PEN: "PEN",
  BRUSH: "BRUSH",
  ERASER: "ERASER",
  // CURVE: "CURVE"
}

const getCanvasColor = function(this: Tool, opacity?: boolean, fullyTransparent?: boolean) {
  const useOpacity = opacity ? (this.opacity / 100).toFixed(2) : 1
  const transparent = fullyTransparent ? 0.0 : useOpacity
  return `rgba(${this.color[0]},${this.color[1]},${this.color[2]}, ${transparent})`
}

export const tools: Record<ToolName, Tool> = {
  PEN: { name: tool_list.PEN, size: 10, color: [255, 0, 0], opacity: 100, getCanvasColor } as Tool,
  BRUSH: { name: tool_list.BRUSH, size: 10, color: [255, 0, 0], opacity: 100, getCanvasColor, image: null } as Tool,
  ERASER: { name: tool_list.ERASER, size: 20, color: [0, 0, 0], opacity: 100, getCanvasColor, image: null } as Tool,
  // CURVE: {name: tool_list.CURVE}
}

export const blend_modes: Record<string, BlendModes> = {
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

export const key_modifers: Record<string, Modifier> = {
  ctrl: 'ctrl',
  alt: 'alt',
  shift: 'shift'
}