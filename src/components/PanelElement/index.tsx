import './styles.css'

function PanelElement({ id, select, selected, onDoubleClick, children }: { id: string | number, select: React.Dispatch<React.SetStateAction<any>>, selected: boolean, onDoubleClick?: () => void, children: React.ReactNode }) {
  return (
    <div onDoubleClick={onDoubleClick} onClick={() => select(id)} className={`p-0.5 w-full h-10 rounded-sm hover:cursor-pointer ${selected ? "panelElement_selected" : ""}`}>
      <div className='panelElement_selected_outline rounded-sm'>
        {children}
      </div>
    </div>
  )
}

export default PanelElement
