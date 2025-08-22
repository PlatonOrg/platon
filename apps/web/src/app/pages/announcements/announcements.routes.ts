import { Routes } from '@angular/router'
import { withAuthGuard } from '@platon/core/browser'

import { AnnouncementsPage } from './announcements.page'

export default [
  withAuthGuard({
    path: '',
    component: AnnouncementsPage,
  }),
] as Routes
