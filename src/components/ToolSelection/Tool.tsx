import PanelElement from "@/components/PanelElement"
import { ToolName } from "@/types"
import { tool_list } from "@/constants"

import { Brush, Eraser, PaintBucket, PenLine, Pipette } from "lucide-react"

const tools = {
  [tool_list.BRUSH]: <Brush strokeWidth={1.5} />,
  [tool_list.ERASER]: <Eraser strokeWidth={1.5} />,
  [tool_list.FILL]: <PaintBucket strokeWidth={1.5} />,
  [tool_list.PEN]: <PenLine strokeWidth={1.5} />,
  [tool_list.EYEDROPPER]: <Pipette strokeWidth={1.5} />,
}

function Tool({ name, select, selected }: { name: ToolName; select: (name: ToolName) => void; selected: boolean }) {
  return (
    <PanelElement selected={selected} select={select} id={name}>
      {tools[name]}
    </PanelElement>
  )
}

export default Tool
