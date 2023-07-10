import { Pipe, PipeTransform } from '@angular/core'
import { AnswerStateLabels, AnswerStates } from '@platon/feature/result/common'

@Pipe({
  name: 'answerStateLabel',
})
export class AnswerStateLabelPipe implements PipeTransform {
  transform(value: AnswerStates): string {
    return AnswerStateLabels[value]
  }
}
