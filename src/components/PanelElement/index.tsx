import './styles.css'

function PanelElement({ id, select, selected, onDoubleClick, children }: { id: string | number, select: React.Dispatch<React.SetStateAction<any>>, selected: boolean, onDoubleClick?: () => void, children: React.ReactNode }) {
  return (
    <div onDoubleClick={onDoubleClick} onClick={() => select(id)} className={`panelElement ${selected ? "panelElement_selected" : ""}`}>
      <div className='panelElement_selected_outline'>
        {children}
      </div>
    </div>
  )
}

export default PanelElement
