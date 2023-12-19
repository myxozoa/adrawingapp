import { Board } from './components/Board/'
import { Layers } from './components/Layers/'
import { Tools } from './components/Tools/'
import { ToolSettings } from './components/ToolSettings'

function App() {
  return (
    <>
    <div className="flex flex-col h-full">
      <ToolSettings/>
      <div className='flex flex-row flex-grow'>
        <Tools />
        <Board />
        <Layers />
      </div>
    </div>
    </>
  )
}

export default App
