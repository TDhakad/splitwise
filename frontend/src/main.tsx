import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { GOOGLE_CLIENT_ID } from './lib/constants';
import { queryClient } from './lib/queryClient';
import './index.css'
import ErrorState from './components/ui/ErrorState';
import App from './App'

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ErrorBoundary fallbackRender={({ error }) => <ErrorState title="The app hit an unexpected error" message={(error as Error).message || "Refresh the page and try again."} />}>
          <App />
        </ErrorBoundary>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
