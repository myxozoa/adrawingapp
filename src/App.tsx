"use client"

import { Board } from "@/components/Board"
import { TopMenu } from "@/components/TopMenu"
import { Layers } from "@/components/LayerSelection/Layers"
import { Tools } from "@/components/ToolSelection/Tools"
import { ToolSettings } from "@/components/ToolSettings"
import { ErrorBoundary } from "@/components/ErrorBoundary"

function App() {
  document.cookie = "allow-edit=false"

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
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
