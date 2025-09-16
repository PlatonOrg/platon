import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TestEntity } from './test.entity'
import { CreateTest, defaultMailContent, defaultTerms, EditorJsData } from '@platon/feature/tests/common'
import { Optional } from 'typescript-optional'
import { EmailService } from '@platon/feature/email/server'
import { ActivityService, CourseMemberService, CourseService } from '@platon/feature/course/server'
import { CourseMemberRoles } from '@platon/feature/course/common'
import { TestsCandidatesService } from './tests-candidates/tests-candidates.service'
import { EditorjsViewerService } from '@platon/shared/utils'
import * as nunjucks from 'nunjucks'

import formatDuration from 'date-fns/formatDuration'
import intervalToDuration from 'date-fns/intervalToDuration'
import fr from 'date-fns/locale/fr'
import { UserEntity } from '@platon/core/server'

@Injectable()
export class TestService {
  constructor(
    @InjectRepository(TestEntity)
    private readonly testsRepository: Repository<TestEntity>,
    private readonly emailService: EmailService,
    private readonly courseMemberService: CourseMemberService,
    private readonly testsCandidatesService: TestsCandidatesService,
    private readonly editorjsViewerService: EditorjsViewerService,
    private readonly courseService: CourseService,
    private readonly activityService: ActivityService
  ) {}

  async createTest(input: CreateTest): Promise<TestEntity> {
    const test = this.testsRepository.create({
      courseId: input.courseId,
      terms: defaultTerms,
      mailContent: defaultMailContent,
      mailSubject: 'Invitation au test {{ testName }}',
    })

    return this.testsRepository.save(test)
  }

  async getTestByCourseId(courseId: string): Promise<Optional<TestEntity>> {
    return Optional.ofNullable(
      await this.testsRepository.findOne({
        where: { courseId },
      })
    )
  }

  async getCompletedTestTerms(courseId: string, user: UserEntity): Promise<EditorJsData> {
    const test = await this.testsRepository.findOne({
      where: { courseId },
    })

    if (!test) {
      throw new Error(`Test not found for ID: ${courseId}`)
    }

    const variables = await this.getVariables(courseId, user)
    return this.processVariables(test.terms, variables)
  }

  async updateTestTerms(testId: string, terms: EditorJsData): Promise<void> {
    await this.testsRepository.update(testId, { terms })
  }

  async updateTestMailContent(testId: string, mailContent: EditorJsData, mailSubject: string): Promise<void> {
    await this.testsRepository.update(testId, { mailContent, mailSubject })
  }

  async sendAllMails(testId: string, origin: string, currentUser: UserEntity): Promise<void> {
    const testMembers = (
      await this.courseMemberService.search(testId, {
        roles: [CourseMemberRoles.student],
      })
    )[0]

    for (const testMember of testMembers) {
      try {
        await this.sendMailToCandidate(testId, testMember.id, origin, currentUser)
      } catch (error) {
        console.error(`Failed to send mail to candidate ${testMember.id}:`, error)
      }
    }
  }

  async sendMailToCandidate(
    testId: string,
    courseMemberId: string,
    origin: string,
    currentUser: UserEntity
  ): Promise<void> {
    const testMember = await this.courseMemberService.findById(testId, courseMemberId)
    if (!testMember) {
      throw new Error(`Test member not found for course member ID: ${courseMemberId}`)
    }

    const candidate = (await this.testsCandidatesService.searchByUsersIds([testMember.get().userId || '']))[0]
    const user = candidate.user
    if (!user || !user.email) {
      throw new Error(`User not found or email not available for candidate ID: ${candidate.id}`)
    }

    const variables = await this.getVariables(testId, user)
    variables['testLink'] = `${origin}/candidate?invitationId=${candidate.linkId}`
    variables['currentFirstName'] = currentUser.firstName || ''
    variables['currentLastName'] = currentUser.lastName || ''
    variables['currentEmail'] = currentUser.email || ''

    const optTest = await this.getTestByCourseId(testId)
    if (!optTest.isPresent()) {
      throw new Error(`Test not found for course ID: ${testId}`)
    }
    const test = optTest.get()
    if (!test.mailContent || !test.mailSubject) {
      throw new Error(`Mail content or subject not set for test ID: ${testId}`)
    }

    const mailSubject = this.processVariables(test.mailSubject, variables)
    const mailContent = this.editorjsViewerService.editorJStoHtml(this.processVariables(test.mailContent, variables))

    await this.emailService.send({
      to: user.email,
      subject: mailSubject,
      html: mailContent,
    })
  }

  private async getVariables(courseId: string, user: UserEntity): Promise<Record<string, string>> {
    const course = (await this.courseService.findById(courseId)).get()
    const activity = (await this.activityService.search(courseId))[0][0]
    const duration = activity.source.variables.settings?.duration
    return {
      testName: course.name || '',
      startDate: activity.openAt ? new Date(activity.openAt).toLocaleDateString() : '',
      endDate: activity.closeAt ? new Date(activity.closeAt).toLocaleDateString() : '',
      startTime: activity.openAt ? new Date(activity.openAt).toLocaleTimeString() : '',
      endTime: activity.closeAt ? new Date(activity.closeAt).toLocaleTimeString() : '',
      duration: duration ? formatDuration(intervalToDuration({ start: 0, end: duration * 1000 }), { locale: fr }) : '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    }
  }

  private processVariables(data: any, variables: Record<string, string>): any {
    if (!data) return data

    const processBlocks = (obj: any): any => {
      if (typeof obj === 'string') {
        try {
          return nunjucks.renderString(obj, variables).trim()
        } catch (e) {
          return obj
        }
      }

      if (Array.isArray(obj)) {
        return obj.map(processBlocks)
      }

      if (typeof obj === 'object' && obj !== null) {
        const processed: any = {}
        for (const key in obj) {
          processed[key] = processBlocks(obj[key])
        }
        return processed
      }

      return obj
    }

    return processBlocks(data)
  }
}
