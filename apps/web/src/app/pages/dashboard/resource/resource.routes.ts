import { Routes } from '@angular/router';
import { ResourceComponent } from './resource.component';

export default [
  {
    path: ':id',
    component: ResourceComponent,
    children: [
      {
        path: 'overview',
        loadChildren: () => import(
          /* webpackChunkName: "resource-overview" */
          './overview/overview.routes'
        )
      },
      {
        path: 'content',
        loadChildren: () => import(
          /* webpackChunkName: "resource-content" */
          './content/content.routes'
        )
      },
      {
        path: 'events',
        loadChildren: () => import(
          /* webpackChunkName: "resource-events" */
          './events/events.routes'
        )
      },
      {
        path: 'settings',
        loadChildren: () => import(
          /* webpackChunkName: "resource-settings" */
          './settings/settings.routes'
        )
      },
      { path: '**', pathMatch: 'full', redirectTo: 'overview' }
    ],
  },
] as Routes;
