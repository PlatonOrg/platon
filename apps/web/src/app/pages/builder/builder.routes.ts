import { Routes } from '@angular/router'
import { BuilderPage } from './builder.page'

export default [
  {
    path: ':id',
    component: BuilderPage,
  },
] as Routes
