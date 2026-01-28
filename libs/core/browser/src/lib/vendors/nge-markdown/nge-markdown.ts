import {
  NgeMarkdownAdmonitionsProvider,
  NgeMarkdownConfigProvider,
  NgeMarkdownEmojiOptionsProvider,
  NgeMarkdownEmojiProvider,
  NgeMarkdownHighlighterMonacoProvider,
  NgeMarkdownHighlighterProvider,
  NgeMarkdownIconsProvider,
  NgeMarkdownKatexOptionsProvider,
  NgeMarkdownKatexProvider,
  NgeMarkdownLinkAnchorProvider,
  NgeMarkdownTabbedSetProvider,
  NgeMarkdownThemeProvider,
} from '@cisstech/nge/markdown'

import { ThomasColorizerService } from './thomas-colorizer.service'

export const NgeMarkdownProviders = [
  NgeMarkdownKatexProvider,
  NgeMarkdownIconsProvider,
  NgeMarkdownEmojiProvider,
  NgeMarkdownTabbedSetProvider,
  NgeMarkdownLinkAnchorProvider,
  NgeMarkdownAdmonitionsProvider,
  NgeMarkdownHighlighterProvider,
  NgeMarkdownConfigProvider({
    darkThemeClassName: 'dark-theme',
  }),
  NgeMarkdownHighlighterMonacoProvider(ThomasColorizerService),
  NgeMarkdownThemeProvider({
    name: 'github',
    styleUrl: 'assets/vendors/nge/markdown/themes/github.css',
  }),
  NgeMarkdownKatexOptionsProvider({
    baseUrl: 'assets/vendors/katex',
  }),
  NgeMarkdownEmojiOptionsProvider({
    url: 'assets/vendors/emoji-toolkit/joypixels.min.js',
  }),
]
