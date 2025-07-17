import { Routes } from '@angular/router'
import { CourseActivityMonitorPage } from './monitor.page'

export default [
  {
    path: ':courseId/:activityId',
    component: CourseActivityMonitorPage,
  },
] as Routes
