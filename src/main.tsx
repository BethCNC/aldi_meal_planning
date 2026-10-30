import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { FirestoreProvider } from './FirestoreProvider' // Use FirestoreProvider

createRoot(document.getElementById('root')!).render( // Added non-null assertion '!'
  <StrictMode>
    <FirestoreProvider>
      <App />
    </FirestoreProvider>
  </StrictMode>,
)
