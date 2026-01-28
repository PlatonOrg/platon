import { AuthToken } from '@platon/core/common'
import { OutputData } from '@editorjs/editorjs'

export interface Test {
  readonly id: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly courseId: string
  readonly terms: OutputData
  readonly mailContent: OutputData
  readonly mailSubject: string
}

export interface CreateTest {
  readonly courseId: string
}

export interface TestsCandidates {
  readonly id: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly userId: string
  readonly courseMemberId: string
  readonly linkId: string
}

export interface CreateTestsCandidates {
  readonly userId: string
  readonly courseMemberId: string
}

export interface CandidateSignInResponse {
  readonly authToken: AuthToken
  readonly testId: string
}

export interface EditorJsData {
  version?: string

  time?: number

  blocks: any[]
}

export interface UpdateTestTermsInput {
  readonly terms: EditorJsData
}

export interface UpdateTestMailContentInput {
  readonly mailContent: EditorJsData
  readonly mailSubject: string
}
