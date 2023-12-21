function Panel({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-card p-1 border rounded-sm select-none ${className ? className : ""}`}>
      {children}
    </div>
  )
}

export default Panel
