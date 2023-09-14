import { ApplicationConfig } from '@angular/core'
import { provideAnimations } from '@angular/platform-browser/animations'
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { importProvidersFrom } from '@angular/core'
import { CoreBrowserModule, TAG_PROVIDERS } from '@platon/core/browser'
import { FeatureWebComponentModule } from '@platon/feature/webcomponent'
import { MatDialogModule } from '@angular/material/dialog'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { PreloadAllModules, provideRouter, withEnabledBlockingInitialNavigation, withPreloading } from '@angular/router'
import { appRoutes } from './app.routes'
import { COURSE_PROVIDERS } from '@platon/feature/course/browser'
import { RESOURCE_PROVIDERS } from '@platon/feature/resource/browser'
import { PLAYER_PROVIDERS } from '@platon/feature/player/browser'
import { RESULT_PROVIDERS } from '@platon/feature/result/browser'
import { LTI_PROVIDERS } from '@platon/feature/lti/browser'
export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    importProvidersFrom(
      CoreBrowserModule,
      FeatureWebComponentModule,

      MatDialogModule,
      MatSnackBarModule
    ),
    provideRouter(appRoutes, withEnabledBlockingInitialNavigation(), withPreloading(PreloadAllModules)),
    COURSE_PROVIDERS,
    RESOURCE_PROVIDERS,
    PLAYER_PROVIDERS,
    RESULT_PROVIDERS,
    LTI_PROVIDERS,
    TAG_PROVIDERS,
  ],
}
