import PanelElement from "@/components/PanelElement"
import type { ToolName } from "@/types"
import { tool_list } from "@/constants"

import { Brush, Eraser, PaintBucket, Pipette } from "lucide-react"

const toolIcons = {
  [tool_list.BRUSH]: <Brush className="h-5 w-5" strokeWidth={1.5} />,
  [tool_list.ERASER]: <Eraser className="h-5 w-5" strokeWidth={1.5} />,
  [tool_list.FILL]: <PaintBucket className="h-5 w-5" strokeWidth={1.5} />,
  // [tool_list.PEN]: <PenLine strokeWidth={1.5} />,
  [tool_list.EYEDROPPER]: <Pipette className="h-5 w-5" strokeWidth={1.5} />,
}

function Tool({ name, select, selected }: { name: ToolName; select: (name: ToolName) => void; selected: boolean }) {
  return (
    <PanelElement className="h-10" selected={selected} select={select} id={name}>
      {toolIcons[name]}
    </PanelElement>
  )
}

export default Tool
