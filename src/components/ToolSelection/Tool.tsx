import { PanelElement } from "@/components/PanelElement"
import type { ToolName } from "@/types"
import { tool_list } from "@/constants"

import { Brush, Eraser, PaintBucket, Pipette } from "lucide-react"
import { memo } from "react"
import { compareProps } from "@/utils/utils"

const toolIcons = {
  [tool_list.BRUSH]: <Brush className="h-5 w-5" strokeWidth={1.5} />,
  [tool_list.ERASER]: <Eraser className="h-5 w-5" strokeWidth={1.5} />,
  [tool_list.FILL]: <PaintBucket className="h-5 w-5" strokeWidth={1.5} />,
  // [tool_list.PEN]: <PenLine strokeWidth={1.5} />,
  [tool_list.EYEDROPPER]: <Pipette className="h-5 w-5" strokeWidth={1.5} />,
}

function _Tool({ name, select, selected }: { name: ToolName; select: (name: ToolName) => void; selected: boolean }) {
  return (
    <PanelElement className="h-10" selected={selected} select={select} id={name}>
      {toolIcons[name]}
    </PanelElement>
  )
}

export const Tool = memo(_Tool, compareProps(["selected"]))
