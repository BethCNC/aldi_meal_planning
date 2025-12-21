import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { SupabaseProvider } from './SupabaseProvider' // Import SupabaseProvider

createRoot(document.getElementById('root')!).render( // Added non-null assertion '!'
  <StrictMode>
    <SupabaseProvider> // Wrap App with SupabaseProvider
      <App />
    </SupabaseProvider>
  </StrictMode>,
)
