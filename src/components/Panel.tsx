function _Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`select-none rounded-md border bg-background  p-1 opacity-95 shadow-md shadow-border ${className ? className : ""}`}
    >
      {children}
    </div>
  )
}

export const Panel = _Panel
