"use client"

import { Board } from "@/components/Board"
import { TopMenu } from "@/components/TopMenu"
import { Layers } from "@/components/LayerSelection/Layers"
import { Tools } from "@/components/ToolSelection/Tools"
import { ToolSettings } from "@/components/ToolSettings"
import { ErrorBoundary } from "@/components/ErrorBoundary"

function App() {
  return (
    <div className="flex max-h-[100dvh] min-h-[100dvh] flex-col">
      <TopMenu />
      <ToolSettings />
      <Tools />
      <Layers />
      <ErrorBoundary fallback={<div>unfortunate!</div>}>
        <Board />
      </ErrorBoundary>
    </div>
  )
}

export default App
