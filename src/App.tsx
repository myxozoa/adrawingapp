import './App.css'
import Board from './components/Board/'
import Layers from './components/Layers/'
import Tools from './components/Tools/'
import ToolSettings from './components/ToolSettings'

import LayerStateProvider from './components/providers/LayerStateProvider'
import ToolStateProvider from './components/providers/ToolStateProvider'
import MainStateProvider from './components/providers/MainStateProvider'

function App() {
  return (
    <>
    <div className="interface-container">
      <MainStateProvider>
        <LayerStateProvider>
          <ToolStateProvider>
            <ToolSettings/>
            <div className='interface-main'>
              <Tools />
              <Board />
              <Layers />
            </div>
          </ToolStateProvider>
        </LayerStateProvider>
      </MainStateProvider>
    </div>
    </>
  )
}

export default App
