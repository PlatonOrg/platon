interface ListItem {
  content: string
  items: ListItem[]
}

interface ListData {
  style: 'ordered' | 'unordered'
  items: ListItem[]
}

const processNestedLists = function testNest(style: string, data: ListItem[]): string {
  const result = data.reduce((acc: string, res: ListItem) => {
    if (res.items.length > 0) return acc + `<li>${res.content}</li>` + testNest(style, res.items)
    else return acc + `<li>${res.content}</li>`
  }, '')
  return `<${style}>${result}</${style}>`
}

export const ListParser = function (data: ListData): string {
  const style = (data.style === 'ordered' ? 'ol' : 'ul') + ' style="padding-left: 1em;"'

  const items = data.items.reduce((acc: string, res: ListItem) => {
    if (res.items.length > 0) {
      return acc + `<li>${res.content}</li>` + processNestedLists(style, res.items)
    } else return acc + `<li>${res.content}</li>`
  }, '')
  return `<${style}>${items}</${style}>`
}
