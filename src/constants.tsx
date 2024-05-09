import { Modifier, ToolName, ToolType } from "@/types"

export const tool_list: Record<ToolName, ToolName> = {
  // PEN: "PEN",
  BRUSH: "BRUSH",
  ERASER: "ERASER",
  FILL: "FILL",
  EYEDROPPER: "EYEDROPPER",
}

export const tool_types: Record<ToolType, ToolType> = {
  STROKE: "STROKE",
  POINT: "POINT",
}

export enum blend_modes {
  normal = 0,
  multiply,
  screen,
  overlay,
  darken,
  lighten,
  colorDodge,
  colorBurn,
  hardLight,
  softLight,
  difference,
  exclusion,
  hue,
  saturation,
  color,
  luminosity,
}

export const key_modifers: Record<string, Modifier> = {
  ctrl: "ctrl",
  alt: "alt",
  shift: "shift",
  space: "space",
}

export const toolPreviewSize = 25

export const enum COLOR_PICKER_ACTIONS {
  SET_HUE = "set_hue",
  SET_SAT_VAL = "set_saturation_and_value",
  SET_HUE_SAT_VAL = "set_hue_saturation_and_value",
}

export const MAX_UINT_16 = 65535
