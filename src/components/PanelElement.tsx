function PanelElement({
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
  return (
    <div
      onDoubleClick={onDoubleClick}
      onClick={() => select(id)}
      className={`w-full rounded-sm p-0.5 hover:cursor-pointer ${className} ${
        selected ? "bg-secondary outline outline-1 outline-secondary-foreground" : ""
      }`}
    >
      <div className="flex h-full items-center justify-center">{children}</div>
    </div>
  )
}

export default PanelElement
