import { Routes } from '@angular/router'
import { CourseReaderPage } from './course-reader.page'

export default [
  {
    title: 'PLaTon - Cours',
    path: ':courseId',
    component: CourseReaderPage,
  },
  { path: '**', redirectTo: '/404' },
] as Routes
