export interface StudentSubmission {
  id: string
  createdAt: Date
  updatedAt: Date

  fileName: string
  fileSize: number
  mimeType: string
  filePath: string
  version: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  checksum?: string
  uploadedAt: Date
  submittedAt?: Date | null
  comment?: string | null
  sessionId: string
  userId: string

  getContent(): Promise<Buffer>
}
