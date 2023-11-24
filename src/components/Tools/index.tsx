import { useContext } from 'react'

import './styles.css'
import Panel from '../Panel'
import Container from '../Container'
import Tool from '../Tool'

import { ToolState } from '../../contexts/ToolState'

function Tools() {
  const { tools, currentTool, setCurrentTool } = useContext(ToolState);

  return (
    <Container className="tools">
      <Panel>
        {Object.values(tools).map((tool) => {
          return <Tool key={tool.name} name={tool.name} id={tool.name} select={setCurrentTool} selected={currentTool.name === tool.name} />})}
      </Panel>
    </Container>
  )
}

export default Tools
