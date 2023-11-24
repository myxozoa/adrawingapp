import './style.css'

function Panel({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`panel ${className ? className : ""}`}>
      {children}
    </div>
  )
}

export default Panel
