import 'jest-preset-angular/setup-jest'

// Suppress known Angular Material/CDK warnings and ng-zorro-antd errors that don't affect tests
if (typeof window !== 'undefined') {
  // Suppress NG0912 component ID collision warnings from ng-zorro-antd
  const originalWarn = console.warn
  console.warn = function (...args: any[]) {
    if (args[0]?.includes?.('NG0912')) {
      return
    }
    originalWarn.apply(console, args)
  }

  // Suppress HttpClientModule error from ant-design icons that doesn't affect tests
  const originalError = console.error
  console.error = function (...args: any[]) {
    if (args[0]?.includes?.('HttpClientModule')) {
      return
    }
    originalError.apply(console, args)
  }
}
