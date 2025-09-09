import { Routes } from '@angular/router'
import { TestCandidatePage } from './candidate.page'
import { withAuthGuard } from '@platon/core/browser'
import { UserRoles } from '@platon/core/common'

export default [
  {
    path: '',
    component: TestCandidatePage,
  },
  withAuthGuard(
    {
      path: 'terms',
      loadChildren: () =>
        import(
          /* webpackChunkName: "candidate-terms" */
          './terms/terms.routes'
        ),
    },
    [UserRoles.candidate]
  ),
] as Routes
