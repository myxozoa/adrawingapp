import { PanelElement } from "@/components/PanelElement"
import type { ToolName } from "@/types"
import { tool_list } from "@/constants"

import {
  PaintBrushRegular,
  PaintBucketRegular,
  EyedropperRegular,
  EraserRegular,
  PaintBrushFilled,
  PaintBucketFilled,
  EyedropperFilled,
  EraserFilled,
  DraftsRegular,
  DraftsFilled,
} from "@fluentui/react-icons"
import { memo } from "react"
import { compareProps } from "@/utils/utils"

const toolIcons = {
  [tool_list.BRUSH]: (
    <PaintBrushRegular className="h-full w-full scale-90 p-1 transition-transform will-change-contents hover:scale-100" />
  ),
  [tool_list.ERASER]: (
    <EraserRegular className="h-full w-full scale-90 p-1 transition-transform will-change-contents hover:scale-100" />
  ),
  [tool_list.PENCIL]: (
    <DraftsRegular className="h-full w-full scale-90 p-1 transition-transform will-change-contents hover:scale-100" />
  ),
  [tool_list.FILL]: (
    <PaintBucketRegular className="h-full w-full scale-90 p-1 transition-transform will-change-contents hover:scale-100" />
  ),
  [tool_list.EYEDROPPER]: (
    <EyedropperRegular className="h-full w-full scale-90 p-1 transition-transform will-change-contents hover:scale-100" />
  ),
}

const toolIconsSelected = {
  [tool_list.BRUSH]: (
    <PaintBrushFilled className="h-full w-full scale-90 p-1 transition-transform will-change-contents hover:scale-100" />
  ),
  [tool_list.ERASER]: (
    <EraserFilled className="h-full w-full scale-90 p-1 transition-transform will-change-contents hover:scale-100" />
  ),
  [tool_list.PENCIL]: (
    <DraftsFilled className="h-full w-full scale-90 p-1 transition-transform will-change-contents hover:scale-100" />
  ),
  [tool_list.FILL]: (
    <PaintBucketFilled className="h-full w-full scale-90 p-1 transition-transform will-change-contents hover:scale-100" />
  ),
  [tool_list.EYEDROPPER]: (
    <EyedropperFilled className="h-full w-full scale-90 p-1 transition-transform will-change-contents hover:scale-100" />
  ),
}

function _Tool({
  name,
  select,
  selected,
  className,
}: {
  name: ToolName
  select: (name: ToolName) => void
  selected: boolean
  className?: string
}) {
  return (
    <PanelElement className={`h-10 ${className}`} selected={selected} select={select} id={name}>
      {selected ? toolIconsSelected[name] : toolIcons[name]}
    </PanelElement>
  )
}

export const Tool = memo(_Tool, compareProps(["selected"]))
