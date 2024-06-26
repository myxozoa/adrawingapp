import { memo, forwardRef } from "react"

function _DrawCanvas(_: any, ref: React.ForwardedRef<HTMLCanvasElement>) {
  return (
    <canvas
      ref={ref}
      onContextMenu={(event) => {
        event.preventDefault()
        return false
      }}
      className="noselect h-full w-full touch-none select-none outline-none will-change-contents"
      tabIndex={0}
    />
  )
}

export const DrawCanvas = memo(forwardRef(_DrawCanvas), () => true)
