import { NgModule } from '@angular/core'

import { HTTP_INTERCEPTORS } from '@angular/common/http'
import { RouterModule } from '@angular/router'
import { AuthProviders } from './auth'
import { GraphQLModule } from './graphql/graphql.module'
import { HttpParamEncoderInterceptor } from './http/http-param-encoder.interceptor'
import { NgZorroProviders } from './vendors/ng-zorro/ng-zorro.'
import { NgeDocProviders } from './vendors/nge-doc/nge-doc'
import { NgeIconProviders } from './vendors/nge-icon/nge-icon'
import { NgeMonacoImports, NgeMonacoProviders } from './vendors/nge-monaco/nge-monaco'
import { NgxEChartsProviders } from './vendors/ngx-echarts/ngx-echarts'
import {
  provideNgeMarkdown,
  withAdmonitions,
  withConfig,
  withEmoji,
  withHighlighter,
  withIcons,
  withKatex,
  withLinkAnchor,
  withTabbedSet,
  withThemes,
} from '@cisstech/nge/markdown'
import { ThomasColorizerService } from './vendors/nge-markdown/thomas-colorizer.service'

@NgModule({
  imports: [RouterModule, NgeMonacoImports, GraphQLModule],
  exports: [NgeMonacoImports, GraphQLModule],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: HttpParamEncoderInterceptor, multi: true },
    AuthProviders,
    NgeDocProviders,
    NgZorroProviders,
    NgeIconProviders,
    NgeMonacoProviders,
    NgxEChartsProviders,
    provideNgeMarkdown(
      withKatex({
        baseUrl: 'assets/vendors/katex',
      }),
      withIcons(),
      withEmoji({
        url: 'assets/vendors/emoji-toolkit/joypixels.min.js',
      }),
      withTabbedSet(),
      withLinkAnchor(),
      withAdmonitions(),
      withHighlighter(ThomasColorizerService),
      withConfig({
        darkThemeClassName: 'dark-theme',
      }),
      withThemes({
        name: 'github',
        styleUrl: 'assets/vendors/nge/markdown/themes/github.css',
      })
    ),
  ],
})
export class CoreBrowserModule {}
