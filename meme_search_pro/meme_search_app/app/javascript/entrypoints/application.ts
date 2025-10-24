// Vite entrypoint for the application

// Import Turbo & Stimulus (keep existing functionality)
import '@hotwired/turbo-rails'
import './controllers'

// Import ActionCable channels
import './channels'

// Import Trix and ActionText
import 'trix'
import '@rails/actiontext'

// Test React import
import HelloReact from '../components/HelloReact'

console.log('Vite ⚡️ Rails - Application loaded')
console.log('React component loaded:', HelloReact)
