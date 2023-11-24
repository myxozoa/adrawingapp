import "./styles.css"

function Container({ children, className }) {
  return (
    <div className={`container ${className}`}>
      {children}
    </div>
  )
}

export default Container
