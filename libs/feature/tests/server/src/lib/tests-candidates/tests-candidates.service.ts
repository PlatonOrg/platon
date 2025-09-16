import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { TestsCandidatesEntity } from './tests-candidates.entity'
import { CandidateSignInResponse, CreateTestsCandidates } from '@platon/feature/tests/common'
import { randomBytes } from 'crypto'
import { UnauthorizedResponse } from '@platon/core/common'
import { AuthService, UserService } from '@platon/core/server'
import { CourseMemberService } from '@platon/feature/course/server'

@Injectable()
export class TestsCandidatesService {
  constructor(
    @InjectRepository(TestsCandidatesEntity)
    private readonly testsCandidatesRepository: Repository<TestsCandidatesEntity>,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly courseMemberService: CourseMemberService
  ) {}

  async createMany(inputs: CreateTestsCandidates[]): Promise<TestsCandidatesEntity[]> {
    const testCandidates = inputs.map((input) => ({
      ...input,
      linkId: randomBytes(32).toString('base64url'),
    }))
    return this.testsCandidatesRepository.save(testCandidates)
  }

  async signInWithInvitation(invitationId: string): Promise<CandidateSignInResponse> {
    const candidate = await this.testsCandidatesRepository.findOne({
      where: { linkId: invitationId },
    })

    if (!candidate) {
      throw new UnauthorizedResponse('Invalid invitation ID')
    }

    const user = (await this.userService.findByIdOrName(candidate?.userId)).orElseThrow(
      () => new UnauthorizedResponse('User not found for the given invitation ID')
    )

    const authToken = await this.authService.authenticate(user.id, user.username)

    const testId = (await this.courseMemberService.getCoursesByMemberId(candidate.courseMemberId))[0]

    return {
      authToken,
      testId,
    }
  }

  async searchByUsersIds(usersIds: string[]): Promise<TestsCandidatesEntity[]> {
    return this.testsCandidatesRepository.find({
      where: { userId: In(usersIds) },
      relations: ['user'],
    })
  }
}
