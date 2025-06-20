/**
 * Récupère la valeur d'une variable CSS au runtime
 */
export function getCSSVariable(variableName: string, element?: HTMLElement): string {
  const targetElement = element || document.documentElement
  const value = getComputedStyle(targetElement).getPropertyValue(variableName).trim()

  // Fallback si la variable n'est pas définie
  if (!value) {
    console.warn(`CSS variable ${variableName} not found`)
    return getDefaultCSSValue(variableName)
  }

  return value
}

/**
 * Valeurs par défaut pour les variables CSS
 */
function getDefaultCSSValue(variableName: string): string {
  const defaults: Record<string, string> = {
    '--brand-background-components': '#ffffff',
    '--brand-background-primary': '#fefefe',
    '--brand-text-primary': 'rgba(0, 0, 0, 0.87)',
    '--brand-text-secondary': 'rgba(0, 0, 0, 0.54)',
    '--brand-color-primary': '#171c8f',
  }

  return defaults[variableName] || '#ffffff'
}

/**
 * Récupère toutes les variables du thème couramment actif
 */
export function getCurrentThemeVariables() {
  return {
    backgroundColor: getCSSVariable('--brand-background-components'),
    textColor: getCSSVariable('--brand-text-primary'),
    primaryColor: getCSSVariable('--brand-color-primary'),
    secondaryTextColor: getCSSVariable('--brand-text-secondary'),
  }
}
