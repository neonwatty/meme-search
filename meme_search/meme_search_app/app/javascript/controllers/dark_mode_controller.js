import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="dark-mode"
export default class extends Controller {
  static targets = ["sunIcon", "moonIcon"]

  connect() {
    this.updateIcons()
  }

  toggle() {
    const html = document.documentElement
    const isDarkMode = html.classList.toggle('dark')

    // Persist preference to localStorage
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')

    // Update icon visibility
    this.updateIcons()

    // Dispatch custom event for other components that may need to react
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { theme: isDarkMode ? 'dark' : 'light' }
    }))
  }

  updateIcons() {
    const isDarkMode = document.documentElement.classList.contains('dark')

    // Toggle icon visibility based on current theme
    // Sun icon shows in dark mode (clicking will go to light)
    // Moon icon shows in light mode (clicking will go to dark)
    this.sunIconTarget.classList.toggle('hidden', !isDarkMode)
    this.moonIconTarget.classList.toggle('hidden', isDarkMode)

    // Update accessibility attributes
    this.element.setAttribute('aria-pressed', isDarkMode)
    this.element.setAttribute('aria-label',
      isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'
    )
  }

  // Allow explicit theme setting from other controllers
  setTheme(theme) {
    const html = document.documentElement
    const shouldBeDark = theme === 'dark'

    html.classList.toggle('dark', shouldBeDark)
    localStorage.setItem('theme', theme)
    this.updateIcons()
  }

  // Reset to system preference
  resetToSystem() {
    localStorage.removeItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', prefersDark)
    this.updateIcons()
  }
}
