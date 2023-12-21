import { useEffect } from "react"
import { Board } from "@/components/Board/"
import { Layers } from "@/components/LayerSelection/Layers"
import { Tools } from "@/components/ToolSelection/Tools"
import { ToolSettings } from "@/components/ToolSettings"

import { ThemeProvider } from "@/components/ThemeProvider"

function App() {
  useEffect(() => {
    window.document.documentElement.classList.add("dark")
  }, [])
  return (
    <ThemeProvider storageKey="draw-ui-theme">
      <div className="flex flex-col h-full">
        <ToolSettings />
        <div className="flex flex-row flex-grow">
          <Tools />
          <Board />
          <Layers />
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
