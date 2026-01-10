import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { router } from '@app/router';
import { Providers } from '@app/providers';
import { AuthProvider } from './contexts/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </AuthProvider>
  </StrictMode>,
);
