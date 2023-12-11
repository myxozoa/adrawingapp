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

// TODO: Remove useless default settings for things some tools dont need from the tools themselves
export const tools: Record<ToolName, Tool> = {
  PEN: {
    name: tool_list.PEN,
    size: 10,
    opacity: 100,
    hardness: 98,
    spacing: 10,
    availableSettings: [ "color", "size" ],
    type: tool_types.STROKE,
    continuous: true
  } as Tool,
  BRUSH: {
    name: tool_list.BRUSH,
    size: 10,
    opacity: 100,
    hardness: 98,
    spacing: 25,
    availableSettings: [ "color", "size", "hardness", "opacity", "spacing" ],
    type: tool_types.STROKE,
    continuous: true,
    image: null
  } as Tool,
  ERASER: {
    name: tool_list.ERASER,
    size: 20,
    opacity: 100,
    hardness: 98,
    spacing: 25,
    availableSettings: [ "size", "opacity", "spacing" ],
    type: tool_types.STROKE,
    continuous: true,
    image: null
  } as Tool,
  FILL: {
    name: tool_list.FILL,
    size: 100,
    opacity: 100,
    hardness: 98,
    spacing: 0,
    availableSettings: [ "color" ],
    type: tool_types.POINT,
    continuous: false
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

export const toolPreviewSize = 100

export const enum COLOR_PICKER_ACTIONS {
  SET_HUE = "set_hue",
  SET_SAT_VAL = "set_saturation_and_value",
  SET_HUE_SAT_VAL = "set_hue_saturation_and_value"
}