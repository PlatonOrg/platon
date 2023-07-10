import { Routes } from '@angular/router'
import { CoursePage } from './course.page'

export default [
  {
    path: '',
    component: CoursePage,
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import(
            /* webpackChunkName: "course-dashboard" */
            './dashboard/dashboard.routes'
          ),
      },
      {
        path: 'teachers',
        loadChildren: () =>
          import(
            /* webpackChunkName: "course-teachers" */
            './teachers/teachers.routes'
          ),
      },
      {
        path: 'students',
        loadChildren: () =>
          import(
            /* webpackChunkName: "course-students" */
            './students/students.routes'
          ),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import(
            /* webpackChunkName: "course-settings" */
            './settings/settings.routes'
          ),
      },
      { path: '**', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
] as Routes
