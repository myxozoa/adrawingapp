import './App.css'
import { Board } from './components/Board/'
import { Layers } from './components/Layers/'
import { Tools } from './components/Tools/'
import { ToolSettings } from './components/ToolSettings'

import MainStateProvider from './components/providers/MainStateProvider'

function App() {
  return (
    <>
    <div className="interface-container">
      <MainStateProvider>
        <ToolSettings/>
        <div className='interface-main'>
          <Tools />
          <Board />
          <Layers />
        </div>
      </MainStateProvider>
    </div>
    </>
  )
}

export default App
