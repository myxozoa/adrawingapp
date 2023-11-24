import './styles.css'

function PanelElement({ id, select, selected, onDoubleClick, children }) {
  return (
    <div onDoubleClick={onDoubleClick} onClick={() => select(id)} className={`panelElement ${selected ? "panelElement_selected" : ""}`}>
      <div className='panelElement_selected_outline'>
        {children}
      </div>
    </div>
  )
}

export default PanelElement
