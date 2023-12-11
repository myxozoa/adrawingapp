import './App.css'
import { Board } from './components/Board/'
import { Layers } from './components/Layers/'
import { Tools } from './components/Tools/'
import { ToolSettings } from './components/ToolSettings'

function App() {
  return (
    <>
    <div className="interface-container">
      <ToolSettings/>
      <div className='interface-main'>
        <Tools />
        <Board />
        <Layers />
      </div>
    </div>
    </>
  )
}

export default App
