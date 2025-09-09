import { Routes } from '@angular/router'
import { TestsPage } from './tests.page'

export default [
  {
    path: '',
    component: TestsPage,
  },
  {
    path: 'create',
    loadChildren: () =>
      import(
        /* webpackChunkName: "test-create" */
        './create/create.routes'
      ),
  },
  {
    path: ':id',
    loadChildren: () =>
      import(
        /* webpackChunkName: "test-detail" */
        './test/test.routes'
      ),
  },
] as Routes
