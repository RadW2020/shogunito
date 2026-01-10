import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface';
import { QueryFailedError } from 'typeorm';

/**
 * Exception filter global que captura todas las excepciones HTTP
 * y las transforma al formato ApiResponse estandarizado
 *
 * Maneja:
 * - HttpException de NestJS
 * - Errores de validación
 * - Errores no capturados
 * - Errores de base de datos
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determinar el status code
    let status: number;
    if (exception instanceof HttpException) {
      status = exception.getStatus();
    } else if (exception instanceof QueryFailedError) {
      // Convertir errores de base de datos comunes a 400
      const errorMessage = exception.message || '';
      if (
        errorMessage.includes('invalid input syntax for type uuid') ||
        errorMessage.includes('invalid UUID')
      ) {
        status = HttpStatus.BAD_REQUEST;
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    // Extraer información del error
    const errorResponse = this.getErrorResponse(exception, status);

    // Log del error (solo errores 5xx en producción)
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : exception,
      );
    } else if (process.env.NODE_ENV !== 'production') {
      this.logger.warn(
        `${request.method} ${request.url} - Status: ${status}`,
        exception instanceof Error ? exception.message : exception,
      );
    }

    // Construir respuesta estandarizada
    const apiErrorResponse = new ApiErrorResponse(
      errorResponse.code,
      errorResponse.message,
      errorResponse.details,
      process.env.NODE_ENV !== 'production' && exception instanceof Error
        ? exception.stack
        : undefined,
    );

    // Enviar respuesta
    response.status(status).json(apiErrorResponse);
  }

  /**
   * Extrae información del error según su tipo
   */
  private getErrorResponse(
    exception: unknown,
    status: number,
  ): { code: string; message: string; details?: Record<string, unknown> } {
    // HttpException de NestJS
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      // Si la respuesta es un objeto con estructura
      if (typeof response === 'object' && response !== null) {
        const responseObj = response as Record<string, unknown>;

        // Errores de validación (class-validator)
        if (Array.isArray(responseObj.message)) {
          return {
            code: this.getErrorCode(status),
            message: 'Validation failed',
            details: { message: responseObj.message },
          };
        }

        // Otros errores con mensaje
        return {
          code: (responseObj.error as string) || this.getErrorCode(status),
          message: (responseObj.message as string) || exception.message,
          details: { details: responseObj.details },
        };
      }

      // Respuesta simple (string)
      return {
        code: this.getErrorCode(status),
        message: typeof response === 'string' ? response : exception.message,
      };
    }

    // Errores de TypeORM (QueryFailedError)
    if (exception instanceof QueryFailedError) {
      const errorMessage = exception.message || '';
      if (
        errorMessage.includes('invalid input syntax for type uuid') ||
        errorMessage.includes('invalid UUID')
      ) {
        return {
          code: 'BAD_REQUEST',
          message: 'Invalid UUID format',
          details: { errorMessage },
        };
      }
      return {
        code: this.getErrorCode(status),
        message: 'Database error',
        details: { errorMessage },
      };
    }

    // Error genérico de JavaScript
    if (exception instanceof Error) {
      return {
        code: this.getErrorCode(status),
        message: exception.message || 'Internal server error',
      };
    }

    // Error desconocido
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
    };
  }

  /**
   * Genera código de error basado en el status HTTP
   */
  private getErrorCode(status: number): string {
    const codeMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.METHOD_NOT_ALLOWED]: 'METHOD_NOT_ALLOWED',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
      [HttpStatus.NOT_IMPLEMENTED]: 'NOT_IMPLEMENTED',
      [HttpStatus.BAD_GATEWAY]: 'BAD_GATEWAY',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
      [HttpStatus.GATEWAY_TIMEOUT]: 'GATEWAY_TIMEOUT',
    };

    return codeMap[status] || `HTTP_${status}`;
  }
}
