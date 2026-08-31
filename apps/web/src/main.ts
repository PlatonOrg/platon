import { provideZoneChangeDetection } from "@angular/core";
import { appConfig } from './app/app.config'

import { bootstrapApplication } from '@angular/platform-browser'

import { AppPage } from './app/app.page'

bootstrapApplication(AppPage, {...appConfig, providers: [provideZoneChangeDetection(), ...appConfig.providers]}).catch((err) => console.error(err))
