import {
  EvalExerciseInput,
  EvalExerciseOutput,
  NextOutput,
  PlayActivityInput,
  PlayActivityOuput,
  PlayAnswersInput,
  PlayAnswersOutput,
  PlayExerciseInput,
  PlayExerciseOuput,
  PreviewInput,
  PreviewOuput,
} from '@platon/feature/player/common'
import { Observable } from 'rxjs'

export abstract class PlayerProvider {
  abstract get(sessionId: string): Observable<PlayExerciseOuput>
  abstract preview(input: PreviewInput): Observable<PreviewOuput>
  abstract playAnswers(input: PlayAnswersInput): Observable<PlayAnswersOutput>
  abstract playActivity(input: PlayActivityInput): Observable<PlayActivityOuput>
  abstract playExercises(input: PlayExerciseInput): Observable<PlayExerciseOuput>
  abstract next(input: PlayExerciseInput): Observable<NextOutput>
  abstract evaluate(input: EvalExerciseInput): Observable<EvalExerciseOutput>
  abstract terminate(sessionId: string): Observable<PlayActivityOuput>
  abstract saveTemporaryAnswer(input: EvalExerciseInput): Observable<void>
}
