function PanelElement({
  id,
  select,
  selected,
  onDoubleClick,
  children,
}: {
  id: string | number
  select: React.Dispatch<React.SetStateAction<any>>
  selected: boolean
  onDoubleClick?: () => void
  children: React.ReactNode
}) {
  return (
    <div
      onDoubleClick={onDoubleClick}
      onClick={() => select(id)}
      className={`h-10 w-full rounded-sm p-0.5 hover:cursor-pointer ${
        selected ? "bg-primary-foreground outline outline-1 outline-muted-foreground" : ""
      }`}
    >
      <div className="flex h-full items-center justify-center rounded-sm">{children}</div>
    </div>
  )
}

export default PanelElement
