import { PanelElement } from "@/components/PanelElement"
import type { ToolName } from "@/types"
import { tool_list } from "@/constants"

import { PaintBrushRegular, PaintBucketRegular, EyedropperRegular, EraserRegular } from "@fluentui/react-icons"
import { memo } from "react"
import { compareProps } from "@/utils/utils"
import { Pencil1Icon } from "@radix-ui/react-icons"

const toolIcons = {
  [tool_list.BRUSH]: <PaintBrushRegular className="h-5 w-5" />,
  [tool_list.ERASER]: <EraserRegular className="h-5 w-5" />,
  [tool_list.PENCIL]: <Pencil1Icon className="h-5 w-5" />,
  [tool_list.FILL]: <PaintBucketRegular className="h-5 w-5" />,
  [tool_list.EYEDROPPER]: <EyedropperRegular className="h-5 w-5" />,
}

function _Tool({ name, select, selected }: { name: ToolName; select: (name: ToolName) => void; selected: boolean }) {
  return (
    <PanelElement className="h-10" selected={selected} select={select} id={name}>
      {toolIcons[name]}
    </PanelElement>
  )
}

export const Tool = memo(_Tool, compareProps(["selected"]))
