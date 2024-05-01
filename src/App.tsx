import { useEffect } from "react"
import { Board } from "@/components/Board"
import { TopMenu } from "@/components/TopMenu"
import { Layers } from "@/components/LayerSelection/Layers"
import { Tools } from "@/components/ToolSelection/Tools"
import { ToolSettings } from "@/components/ToolSettings"
import { ErrorBoundary } from "@/components/ErrorBoundary"

import { ThemeProvider } from "@/components/ThemeProvider"

function App() {
  useEffect(() => {
    window.document.documentElement.classList.add("dark")
  }, [])
  return (
    <ThemeProvider storageKey="draw-ui-theme">
      <div className="flex max-h-[100dvh] min-h-[100dvh] flex-col">
        <TopMenu />
        <ToolSettings />
        <Tools />
        <ErrorBoundary fallback={<div>unfortunate!</div>}>
          <Board />
        </ErrorBoundary>
        <Layers />
      </div>
    </ThemeProvider>
  )
}

export default App
