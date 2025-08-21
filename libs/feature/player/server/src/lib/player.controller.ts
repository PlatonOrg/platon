import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { IRequest, Public, UUIDParam } from '@platon/core/server'
import { EvalExerciseInput, NextOutput, PlayAnswersInput } from '@platon/feature/player/common'
import {
  EvalExerciseOutputDTO,
  PlayActivityInputDTO,
  PlayActivityOutputDTO,
  PlayAnswersOutputDTO,
  PlayExerciseInputDTO,
  PlayExerciseOuputDTO,
  PreviewInputDTO,
  PreviewOuputDTO,
} from './player.dto'
import { PlayerService } from './player.service'
import { Response } from 'express'

@ApiBearerAuth()
@Controller('player')
@ApiTags('Players')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Public()
  @Post('/preview')
  preview(@Req() req: IRequest, @Body() input: PreviewInputDTO): Promise<PreviewOuputDTO> {
    return this.playerService.preview(input, req.user)
  }

  @Public()
  @Post('/play/answers')
  async playAnswers(@Body() input: PlayAnswersInput): Promise<PlayAnswersOutputDTO> {
    return {
      exercises: await this.playerService.answers(input.sessionId),
    }
  }

  @Public()
  @Post('/play/activity')
  playActivity(@Req() req: IRequest, @Body() input: PlayActivityInputDTO): Promise<PlayActivityOutputDTO> {
    return this.playerService.playActivity(input.activityId, req.user)
  }

  @Public()
  @Post('/play/exercises')
  playExercises(@Req() req: IRequest, @Body() input: PlayExerciseInputDTO): Promise<PlayExerciseOuputDTO> {
    return this.playerService.playExercises(input.activitySessionId, input.exerciseSessionIds, req.user)
  }

  @Public()
  @Post('/next/')
  next(@Req() req: IRequest, @Body() input: PlayExerciseInputDTO): Promise<NextOutput> {
    return this.playerService.playNext(input.activitySessionId, req.user)
  }

  @Public()
  @Post('/terminate/:sessionId')
  async terminate(@Req() req: IRequest, @UUIDParam('sessionId') sessionId: string): Promise<PlayActivityOutputDTO> {
    return this.playerService.terminate(sessionId, req.user)
  }

  @Public()
  @Get('/environment/:sessionId')
  async downloadEnvironment(@Req() req: IRequest, @UUIDParam('sessionId') sessionId: string, @Res() res: Response) {
    const { envid, content } = await this.playerService.downloadEnvironment(sessionId, req.user)
    res.setHeader('Content-Type', 'application/gzip')
    res.setHeader('Content-Disposition', `attachment; filename=${envid}.tgz`)
    const buffer = Buffer.from(content, 'binary')
    res.send(buffer)
  }

  @Public()
  @Post('/evaluate')
  async evaluate(@Req() req: IRequest, @Body() input: EvalExerciseInput): Promise<EvalExerciseOutputDTO> {
    const response = await this.playerService.evaluate(input, req.user)
    return {
      exercise: Array.isArray(response) ? response[0] : response,
      navigation: Array.isArray(response) ? response[1] : undefined,
    }
  }

  @Public()
  @Post('/saveTemporaryAnswer')
  async saveTemporaryAnswer(@Req() req: IRequest, @Body() input: EvalExerciseInput): Promise<void> {
    await this.playerService.saveTemporaryAnswer(input, req.user)
  }

  @Public()
  @Post('/disagree-solution')
  async disagreeSolution(@Req() req: IRequest, @Body() input: { sessionId: string }): Promise<void> {
    await this.playerService.disagreeSolution(input.sessionId, req.user)
  }
}
