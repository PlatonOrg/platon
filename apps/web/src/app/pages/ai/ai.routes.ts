import { Routes } from '@angular/router'
import { withAuthGuard } from '@platon/core/browser'

import { AiPage } from './ai.page'
import { UserRoles } from '@platon/core/common'

export default [
  withAuthGuard(
    {
      path: '',
      component: AiPage,
    },
    [UserRoles.admin, UserRoles.teacher]
  ),
  withAuthGuard(
    {
      path: 'c/:chatId',
      component: AiPage,
    },
    [UserRoles.admin, UserRoles.teacher]
  ),
] as Routes
