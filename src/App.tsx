import { useEffect } from "react"
import { Board } from "@/components/Board"
import { TopMenu } from "@/components/TopMenu"
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
      <TopMenu />
      <ToolSettings />
      <Tools />
      <Board />
    </ThemeProvider>
  )
}

export default App
