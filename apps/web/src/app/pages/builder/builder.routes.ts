import { CanDeactivateFn, Routes } from '@angular/router'
import { BuilderPage } from './builder.page'

const canDeactivateBuilder: CanDeactivateFn<BuilderPage> = (component) => component.canDeactivate()

export default [
  {
    path: ':id',
    component: BuilderPage,
    canDeactivate: [canDeactivateBuilder],
  },
  { path: '**', redirectTo: '/404' },
] as Routes
