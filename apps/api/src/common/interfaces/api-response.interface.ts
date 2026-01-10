/**
 * Interfaz estándar para todas las respuestas de la API
 * Proporciona una estructura consistente para respuestas exitosas y errores
 */
export interface ApiResponse<T = any> {
  /**
   * Indica si la operación fue exitosa
   */
  success: boolean;

  /**
   * Datos de la respuesta (solo presente en respuestas exitosas)
   */
  data?: T;

  /**
   * Información del error (solo presente en respuestas con error)
   */
  error?: ApiError;

  /**
   * Metadata adicional (paginación, totales, etc.)
   */
  metadata?: ApiMetadata;

  /**
   * Información de paginación (solo presente en respuestas paginadas)
   */
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Estructura de error estandarizada
 */
export interface ApiError {
  /**
   * Código de error para identificación programática
   */
  code: string;

  /**
   * Mensaje de error legible para humanos
   */
  message: string;

  /**
   * Detalles adicionales del error (opcional)
   */
  details?: any;

  /**
   * Stack trace (solo en desarrollo)
   */
  stack?: string;
}

/**
 * Metadata adicional para respuestas
 */
export interface ApiMetadata {
  /**
   * Página actual (para paginación)
   */
  page?: number;

  /**
   * Total de elementos
   */
  total?: number;

  /**
   * Elementos por página
   */
  perPage?: number;

  /**
   * Total de páginas
   */
  totalPages?: number;

  /**
   * Timestamp de la respuesta
   */
  timestamp?: string;

  /**
   * Versión de la API
   */
  version?: string;
}

/**
 * Clase helper para construir respuestas exitosas
 */
export class ApiSuccessResponse<T = any> implements ApiResponse<T> {
  success = true;
  data?: T;
  metadata?: ApiMetadata;

  constructor(data?: T, metadata?: ApiMetadata) {
    this.data = data;
    this.metadata = {
      ...metadata,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Clase helper para construir respuestas con error
 */
export class ApiErrorResponse implements ApiResponse {
  success = false;
  error: ApiError;
  metadata?: ApiMetadata;

  constructor(code: string, message: string, details?: any, stack?: string) {
    this.error = {
      code,
      message,
      details,
      stack,
    };
    this.metadata = {
      timestamp: new Date().toISOString(),
    };
  }
}
