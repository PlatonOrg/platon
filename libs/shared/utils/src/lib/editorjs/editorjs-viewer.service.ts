import EdjsParser from 'editorjs-parser'
import { ListParser } from './parsers/list-parser'
import { ChecklistParser } from './parsers/checklist-parser'

export class EditorjsViewerService {
  private readonly parser = new EdjsParser(undefined, {
    list: ListParser,
    checklist: ChecklistParser,
  })

  editorJStoHtml = (data: any) => {
    return this.parser.parse(data)
  }
}
