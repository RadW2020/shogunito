import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './layout';
import { HomePage } from '../pages/home-page';
import { ROUTES } from '../shared/constants/routes';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from '../components/auth/ResetPasswordForm';
import { PrivateRoute } from '../components/auth/PrivateRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: ROUTES.HOME,
        element: (
          <PrivateRoute>
            <HomePage />
          </PrivateRoute>
        ),
      },
      {
        path: ROUTES.LOGIN,
        element: <LoginForm />,
      },
      {
        path: ROUTES.REGISTER,
        element: <RegisterForm />,
      },
      {
        path: ROUTES.FORGOT_PASSWORD,
        element: <ForgotPasswordForm />,
      },
      {
        path: ROUTES.RESET_PASSWORD,
        element: <ResetPasswordForm />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
