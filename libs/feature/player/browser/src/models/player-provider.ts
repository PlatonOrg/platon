import {
  EvalExerciseInput,
  EvalExerciseOutput,
  PlayActivityInput,
  PlayActivityOuput,
  PlayAnswersInput,
  PlayAnswersOutput,
  PlayExerciseInput,
  PlayExerciseOuput,
  PreviewOuput,
} from '@platon/feature/player/common'
import { Observable } from 'rxjs'

export abstract class PlayerProvider {
  abstract preview(resource: string, version: string): Observable<PreviewOuput>

  abstract playAnswers(input: PlayAnswersInput): Observable<PlayAnswersOutput>
  abstract playActivity(input: PlayActivityInput): Observable<PlayActivityOuput>
  abstract playExercises(input: PlayExerciseInput): Observable<PlayExerciseOuput>
  abstract evaluate(input: EvalExerciseInput): Observable<EvalExerciseOutput>
  abstract terminate(sessionId: string): Observable<PlayActivityOuput>
}
