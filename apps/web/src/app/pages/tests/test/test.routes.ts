import { Routes } from '@angular/router'
import { TestPage } from './test.page'

export default [
  {
    path: '',
    component: TestPage,
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import(
            /* webpackChunkName: "test-dashboard" */
            './dashboard/dashboard.routes'
          ),
      },
      {
        path: 'candidates',
        loadChildren: () =>
          import(
            /* webpackChunkName: "test-candidates" */
            './candidates/candidates.routes'
          ),
      },
      {
        path: 'csv-import',
        loadChildren: () =>
          import(
            /* webpackChunkName: "csv-import" */
            './csv-import/csv-import.routes'
          ),
      },
      {
        path: 'results',
        loadChildren: () =>
          import(
            /* webpackChunkName: "test-results" */
            './results/results.routes'
          ),
      },

      { path: '**', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
] as Routes
