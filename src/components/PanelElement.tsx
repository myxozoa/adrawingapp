import { compareProps } from "@/utils/utils"
import { memo, useCallback } from "react"

function _PanelElement({
  id,
  select,
  selected,
  onDoubleClick,
  className,
  children,
}: {
  id: string | number
  select: React.Dispatch<React.SetStateAction<any>>
  selected: boolean
  onDoubleClick?: () => void
  className?: string
  children: React.ReactNode
}) {
  const handleClick = useCallback(() => select(id), [select, id])
  return (
    <div
      onDoubleClick={onDoubleClick}
      onClick={handleClick}
      className={`w-full rounded-sm p-0.5 hover:cursor-pointer ${className} ${selected ? "bg-secondary" : ""}`}
    >
      <div className="flex h-full items-center justify-center">{children}</div>
    </div>
  )
}

export const PanelElement = memo(_PanelElement, compareProps(["className", "selected", "children"]))
