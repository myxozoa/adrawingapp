import { useEffect } from "react"
import { Board } from "@/components/Board"
// import { Layers } from "@/components/LayerSelection/Layers"
import { Tools } from "@/components/ToolSelection/Tools"
import { ToolSettings } from "@/components/ToolSettings"

import { ThemeProvider } from "@/components/ThemeProvider"

function App() {
  useEffect(() => {
    window.document.documentElement.classList.add("dark")
  }, [])
  return (
    <ThemeProvider storageKey="draw-ui-theme">
      <div className="flex h-full flex-col">
        <ToolSettings />
        <div className="flex grow flex-row">
          <Tools />
          <Board />
          {/* <Layers /> */}
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
