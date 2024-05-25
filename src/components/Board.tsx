import { useEffect, useLayoutEffect, useRef, memo } from "react"

import { DrawCanvas } from "@/components/DrawCanvas"

import { Application } from "@/managers/ApplicationManager"

function _Board() {
  const boardRef = useRef() as React.MutableRefObject<HTMLCanvasElement>

  useLayoutEffect(() => {
    const rect = boardRef.current.parentElement!.getBoundingClientRect()

    Application.createCanvas(boardRef.current, rect.width, rect.height)
    Application.resize()
  }, [])

  useEffect(() => {
    Application.init()
    return () => {
      Application.destroy()
    }
  }, [])

  return (
    <div className="noselect flex flex-1">
      <DrawCanvas ref={boardRef} />
    </div>
  )
}

export const Board = memo(_Board, () => true)
