import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiService } from '../../shared/api/client';
import { ROUTES } from '../../shared/constants/routes';

export const ResetPasswordForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  // Validar el token al cargar el componente
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Token de recuperación no proporcionado');
        setIsValidatingToken(false);
        return;
      }

      try {
        const response = await apiService.validateResetToken(token);
        if (response.valid) {
          setTokenValid(true);
        } else {
          setError(response.message || 'El token es inválido o ha expirado');
        }
      } catch (err: any) {
        setError(err.message || 'Error al validar el token de recuperación');
      } finally {
        setIsValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'La contraseña debe contener al menos una letra minúscula';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'La contraseña debe contener al menos una letra mayúscula';
    }
    if (!/\d/.test(pwd)) {
      return 'La contraseña debe contener al menos un número';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    // Validar fortaleza de la contraseña
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (!token) {
      setError('Token de recuperación no válido');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiService.resetPassword(token, password);
      setSuccess(true);
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        navigate(ROUTES.LOGIN);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contraseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostrar loading mientras se valida el token
  if (isValidatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Validando token...</div>
      </div>
    );
  }

  // Mostrar error si el token no es válido
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-white">Token inválido</h2>
          </div>
          <div className="rounded-md bg-red-900/50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-400">{error}</h3>
                <p className="mt-2 text-xs text-red-300">
                  El enlace puede haber expirado o ya haber sido utilizado.
                </p>
              </div>
            </div>
          </div>
          <div className="text-center space-y-4">
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="font-medium text-blue-500 hover:text-blue-400"
            >
              Solicitar nuevo enlace de recuperación
            </Link>
            <div>
              <Link
                to={ROUTES.LOGIN}
                className="font-medium text-gray-400 hover:text-gray-300 text-sm"
              >
                ← Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar mensaje de éxito
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
              ¡Contraseña actualizada!
            </h2>
          </div>
          <div className="rounded-md bg-green-900/50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-400">
                  Tu contraseña ha sido actualizada exitosamente
                </h3>
                <p className="mt-2 text-xs text-green-300">
                  Redirigiendo al inicio de sesión en 3 segundos...
                </p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <Link to={ROUTES.LOGIN} className="font-medium text-blue-500 hover:text-blue-400">
              Ir al inicio de sesión ahora
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Formulario de nueva contraseña
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Crear nueva contraseña
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">Ingresa tu nueva contraseña</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-900/50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-400">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="sr-only">
                Nueva contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="text-xs text-gray-400 space-y-1">
              <p className="font-semibold">Requisitos de la contraseña:</p>
              <ul className="list-disc list-inside space-y-1">
                <li className={password.length >= 8 ? 'text-green-400' : 'text-gray-400'}>
                  Mínimo 8 caracteres
                </li>
                <li className={/[a-z]/.test(password) ? 'text-green-400' : 'text-gray-400'}>
                  Al menos una letra minúscula
                </li>
                <li className={/[A-Z]/.test(password) ? 'text-green-400' : 'text-gray-400'}>
                  Al menos una letra mayúscula
                </li>
                <li className={/\d/.test(password) ? 'text-green-400' : 'text-gray-400'}>
                  Al menos un número
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Restableciendo...
                </span>
              ) : (
                'Restablecer contraseña'
              )}
            </button>

            <div className="text-center">
              <Link
                to={ROUTES.LOGIN}
                className="font-medium text-blue-500 hover:text-blue-400 text-sm"
              >
                ← Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
