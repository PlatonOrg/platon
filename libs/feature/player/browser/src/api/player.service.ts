import { Injectable } from '@angular/core'
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
import { PlayerProvider } from '../models/player-provider'

@Injectable({ providedIn: 'root' })
export class PlayerService {
  constructor(private readonly provider: PlayerProvider) {}

  preview(resource: string, version: string): Observable<PreviewOuput> {
    return this.provider.preview(resource, version)
  }

  playAnswers(input: PlayAnswersInput): Observable<PlayAnswersOutput> {
    return this.provider.playAnswers(input)
  }

  playActivity(input: PlayActivityInput): Observable<PlayActivityOuput> {
    return this.provider.playActivity(input)
  }

  playExercises(input: PlayExerciseInput): Observable<PlayExerciseOuput> {
    return this.provider.playExercises(input)
  }

  evaluate(input: EvalExerciseInput): Observable<EvalExerciseOutput> {
    return this.provider.evaluate(input)
  }

  terminate(sessionId: string): Observable<PlayActivityOuput> {
    return this.provider.terminate(sessionId)
  }
}
