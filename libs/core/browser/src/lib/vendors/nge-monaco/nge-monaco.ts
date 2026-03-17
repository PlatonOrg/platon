import { Provider } from '@angular/core'
import { NgeMonacoModule, NGE_MONACO_CONTRIBUTION, NGE_MONACO_THEMES } from '@cisstech/nge/monaco'
import { PlLanguageContribution } from './contributions/pl-lang.contribution'

const monacoAssetsUrl = new URL('/assets/vendors/nge/monaco/', window.location.origin).toString()

export const NgeMonacoImports = [
  NgeMonacoModule.forRoot({
    locale: 'fr',
    assets: monacoAssetsUrl,
    theming: {
      themes: NGE_MONACO_THEMES.map((theme) => monacoAssetsUrl + 'themes/' + theme),
      default: 'github',
    },
    options: {
      automaticLayout: true,
    },
  }),
]

export const NgeMonacoProviders: Provider = [
  {
    provide: NGE_MONACO_CONTRIBUTION,
    multi: true,
    useClass: PlLanguageContribution,
  },
]
