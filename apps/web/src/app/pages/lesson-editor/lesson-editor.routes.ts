import { Routes } from '@angular/router'
import { LessonEditorPage } from './lesson-editor.page'

export default [
  {
    title: 'PLaTon - Leçon',
    path: ':courseId/:activityId',
    component: LessonEditorPage,
  },
  { path: '**', redirectTo: '/404' },
] as Routes
