import "./styles.css"

function Container({ children, className }: { children: React.ReactNode, className: string }) {
  return (
    <div className={`container ${className}`}>
      {children}
    </div>
  )
}

export default Container
