import { memo } from 'react'

import './styles.css'
import Panel from '../Panel'
import Container from '../Container'
import Tool from '../Tool'

import { tools } from '../../constants'
import { useToolStore } from '../../stores/ToolStore'

function _Tools() {
  const currentTool = useToolStore.use.currentTool()
  const setCurrentTool = useToolStore.use.setCurrentTool()

  return (
    <Container className="tools">
      <Panel>
        {Object.values(tools).map((tool) => {
          return <Tool key={tool.name} name={tool.name} select={setCurrentTool} selected={currentTool.name === tool.name} />})}
      </Panel>
    </Container>
  )
}

export const Tools = memo(_Tools)
