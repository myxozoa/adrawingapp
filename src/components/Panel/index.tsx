import './style.css'

function Panel({ children, className }) {
  return (
    <div className={`panel ${className ? className : ""}`}>
      {children}
    </div>
  )
}

export default Panel
