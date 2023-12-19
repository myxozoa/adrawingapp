import { memo } from 'react'

import Panel from '../../Panel'
import Container from '../../Container'
import Tool from '../Tool'

import { useToolStore } from '../../../stores/ToolStore'

import { tools } from '../../../objects/Tool'

import { DarkModeToggle } from '@/components/DarkModeToggle'

function _Tools() {
  const currentTool = useToolStore.use.currentTool()
  const setCurrentTool = useToolStore.use.setCurrentTool()

  return (
    <Container className="w-10">
      <Panel className='flex flex-col grow w-full justify-between'>
        <div>

        {Object.values(tools).map((tool) => {
          return <Tool key={tool.name} name={tool.name} select={setCurrentTool} selected={currentTool.name === tool.name} />})}
        </div>

        <DarkModeToggle />
      </Panel>
    </Container>
  )
}

export const Tools = memo(_Tools)
