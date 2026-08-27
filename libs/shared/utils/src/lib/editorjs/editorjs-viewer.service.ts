// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore : ts-expect-error is not recognized by the linter / no types available for editorjs-parser
import EdjsParser from 'editorjs-parser'
import { ListParser } from './parsers/list-parser'
import { ChecklistParser } from './parsers/checklist-parser'
import { CodeParser } from './parsers/code-parser'
import { CalloutParser } from './parsers/callout-parser'
import { EmbedParser } from './parsers/embed-parser'
import { VideoParser } from './parsers/video-parser'
import { ExerciseParser } from './parsers/exercise-parser'

export class EditorjsViewerService {
  private readonly parser = new EdjsParser(undefined, {
    list: ListParser,
    checklist: ChecklistParser,
    code: CodeParser,
    callout: CalloutParser,
    embed: EmbedParser,
    video: VideoParser,
    exercise: ExerciseParser,
  })

  hasCodeBlock = (data: any): boolean => {
    return data?.blocks?.some((block: any) => block.type === 'code') ?? false
  }

  editorJStoHtml = (data: any) => {
    return this.parser.parse(data)
  }
}
