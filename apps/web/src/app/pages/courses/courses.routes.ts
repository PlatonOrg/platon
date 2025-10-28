import { Routes } from '@angular/router'
import { CoursesPage } from './courses.page'

export default [
  {
    title: 'PLaTon - Cours',
    path: '',
    component: CoursesPage,
  },
  {
    title: 'PLaTon - Création',
    path: 'create',
    loadChildren: () =>
      import(
        /* webpackChunkName: "course-create" */
        './create/create.routes'
      ),
  },
  {
    path: ':id',
    loadChildren: () =>
      import(
        /* webpackChunkName: "course-detail" */
        './course/course.routes'
      ),
  },
] as Routes
