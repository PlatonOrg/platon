interface ChecklistItem {
  text: string
  checked: boolean
}

interface ChecklistData {
  items: ChecklistItem[]
}

export const ChecklistParser = function (data: ChecklistData): string {
  const items = data.items.reduce((acc: string, item: ChecklistItem) => {
    const checkedAttribute = item.checked ? 'checked' : ''
    const checkedClass = item.checked ? 'checked' : 'unchecked'
    return (
      acc +
      `<div class="checklist-item ${checkedClass}">
      <input type="checkbox" ${checkedAttribute} disabled>
      <span class="checklist-text">${item.text}</span>
      </div>`
    )
  }, '')

  return `<div class="checklist">${items}</div>`
}
