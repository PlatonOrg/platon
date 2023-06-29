export interface CourseDemo {
  readonly courseId: string;
  readonly uri: string;
}

export interface CourseDemoAccessAnswer {
  readonly courseId: string;
  readonly accesstoken?: string;
  readonly refreshToken?: string;
}
