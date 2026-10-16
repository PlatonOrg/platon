export interface CourseSection {
  readonly id: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly name: string
  readonly order: number
  readonly courseId: string
  readonly hidden: boolean
}

export interface CreateCourseSection {
  readonly name: string
  readonly order: number
}

export interface UpdateCourseSection {
  readonly name?: string
  readonly order?: number
  readonly hidden?: boolean
}
