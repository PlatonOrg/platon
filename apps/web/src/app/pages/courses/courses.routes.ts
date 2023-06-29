import { Routes } from '@angular/router';
import { CoursesPage } from './courses.page';

export default [
  {
    path: '',
    component: CoursesPage,
  },
  {
    path: 'create',
    loadChildren: () =>
      import(
        /* webpackChunkName: "course-create" */
        './create/create.routes'
      ),
  },
  {
    path: 'demo',
    loadChildren: () =>
      import(
        /* webpackChunkName: "course-demo" */
        './demo/demo.routes'
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
] as Routes;
