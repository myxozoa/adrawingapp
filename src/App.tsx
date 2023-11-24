import './App.css'
import Board from './components/Board/'
import Layers from './components/Layers/'
import Tools from './components/Tools/'
import ToolSettings from './components/ToolSettings'

import LayerStateProvider from './components/providers/LayerStateProvider.jsx'
import ToolStateProvider from './components/providers/ToolStateProvider.jsx'

function App() {
  return (
    <>
    <div className="interface-container">
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
    </div>
    </>
  )
}

export default App
