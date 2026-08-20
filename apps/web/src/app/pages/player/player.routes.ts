import { Routes } from '@angular/router'

export default [
  {
    path: 'preview',
    loadChildren: () =>
      import(
        /* webpackChunkName: "player-preview" */
        './preview/preview.routes'
      ),
  },
  {
    path: 'activity',
    loadChildren: () =>
      import(
        /* webpackChunkName: "player-activity" */
        './activity/activity.routes'
      ),
  },
  {
    path: 'correction',
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
