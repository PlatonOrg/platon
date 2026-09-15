import { Routes } from '@angular/router'
import { alwaysLightTheme } from '@platon/core/browser'

export default [
  {
    path: 'preview',
    data: {
      ...alwaysLightTheme,
    },
    loadChildren: () =>
      import(
        /* webpackChunkName: "player-preview" */
        './preview/preview.routes'
      ),
  },
  {
    path: 'activity',
    data: {
      ...alwaysLightTheme,
    },
    loadChildren: () =>
      import(
        /* webpackChunkName: "player-activity" */
        './activity/activity.routes'
      ),
  },
  {
    path: 'correction',
    data: {
      ...alwaysLightTheme,
    },
    loadChildren: () =>
      import(
        /* webpackChunkName: "player-correction" */
        './correction/correction.routes'
      ),
  },
  {
    path: 'course',
    loadChildren: () =>
      import(
        /* webpackChunkName: "player-course" */
        './course/course-reader.routes'
      ),
  },
] as Routes
