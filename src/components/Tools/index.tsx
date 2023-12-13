import { memo } from 'react'

import Panel from '../Panel'
import Container from '../Container'
import Tool from '../Tool'

import { useToolStore } from '../../stores/ToolStore'

import { tools } from '../../objects/Tool'

function _Tools() {
  const currentTool = useToolStore.use.currentTool()
  const setCurrentTool = useToolStore.use.setCurrentTool()

  return (
    <Container className="w-20">
      <Panel className='grow w-full'>
        {Object.values(tools).map((tool) => {
          return <Tool key={tool.name} name={tool.name} select={setCurrentTool} selected={currentTool.name === tool.name} />})}
      </Panel>
    </Container>
  )
}

export const Tools = memo(_Tools)
