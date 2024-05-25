function _Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`select-none rounded-sm border bg-card p-0.5 ${className ? className : ""}`}>{children}</div>
}

export const Panel = _Panel
