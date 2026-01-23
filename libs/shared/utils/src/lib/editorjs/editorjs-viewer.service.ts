// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore : ts-expect-error is not recognized by the linter / no types available for editorjs-parser
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
