import PanelElement from '../../PanelElement'
import { ToolName } from '../../../types'
import { tool_list } from '@/constants'

import { Brush, Eraser, PaintBucket, PenLine } from 'lucide-react'

const tools = {
  [tool_list.BRUSH]: <Brush />,
  [tool_list.ERASER]: <Eraser />,
  [tool_list.FILL]: <PaintBucket />,
  [tool_list.PEN]: <PenLine />
}

function Tool({ name, select, selected }: { name: ToolName, select: (name: ToolName) => void, selected: boolean }) {
  return (
    <PanelElement selected={selected} select={select} id={name}>
        {/* <p className='m-0'>{name}</p> */}
        {tools[name]}
    </PanelElement>
  )
}

export default Tool
