import './styles.css'

import PanelElement from '../PanelElement'

function Tool({ name, select, selected, id }) {
  return (
    <PanelElement selected={selected} select={select} id={id}>
        <p className='tool_label'>{name}</p>
    </PanelElement>
  )
}

export default Tool
