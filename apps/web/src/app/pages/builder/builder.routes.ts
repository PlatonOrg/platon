import { Routes } from '@angular/router'
import { BuilderPage } from './builder.page'

export default [
  {
    path: ':id',
    component: BuilderPage,
  },
  { path: '**', redirectTo: '/404' },
] as Routes
