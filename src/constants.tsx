import { BlendModes, Modifier, Tool, ToolName, ToolType } from "./types"

export const tool_list: Record<ToolName, ToolName> = {
  PEN: "PEN",
  BRUSH: "BRUSH",
  ERASER: "ERASER",
  FILL: "FILL"
  // CURVE: "CURVE"
}

export const tool_types: Record<ToolType, ToolType> = {
  STROKE: "STROKE",
  POINT: "POINT"
}

const getCanvasColor = function(this: Tool, opacity?: boolean, fullyTransparent?: boolean) {
  if (!this.color || !this.opacity) return 'rgba(0,0,0,0)'

  const useOpacity = opacity ? (this.opacity / 100).toFixed(2) : 1
  const transparent = fullyTransparent ? 0.0 : useOpacity
  return `rgba(${this.color[0]},${this.color[1]},${this.color[2]}, ${transparent})`
}

// TODO: Remove useless default settings for things some tools dont need from the tools themselves
export const tools: Record<ToolName, Tool> = {
  PEN: {
    name: tool_list.PEN,
    size: 10,
    color: [255, 0, 0],
    opacity: 100,
    hardness: 100,
    spacing: 1,
    availableSettings: [ "color", "size" ],
    type: tool_types.STROKE,
    continuous: true,
    getCanvasColor
  } as Tool,
  BRUSH: {
    name: tool_list.BRUSH,
    size: 10,
    color: [255, 0, 0],
    opacity: 100,
    hardness: 100,
    spacing: 25,
    availableSettings: [ "color", "size", "hardness", "opacity", "spacing" ],
    getCanvasColor,
    type: tool_types.STROKE,
    continuous: true,
    image: null
  } as Tool,
  ERASER: {
    name: tool_list.ERASER,
    size: 20,
    color: [0, 0, 0],
    opacity: 100,
    hardness: 100,
    spacing: 25,
    availableSettings: [ "color", "size", "opacity", "spacing" ],
    getCanvasColor,
    type: tool_types.STROKE,
    continuous: true,
    image: null
  } as Tool,
  FILL: {
    name: tool_list.FILL,
    size: 10,
    color: [255, 0, 0],
    opacity: 100,
    hardness: 100,
    spacing: 0,
    availableSettings: [ "color" ],
    type: tool_types.POINT,
    continuous: false,
    getCanvasColor
  }
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

export const smoothLength = 6

export const toolPreviewSize = 100
