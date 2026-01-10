import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

/**
 * Interceptor global que transforma todas las respuestas exitosas al formato ApiResponse
 *
 * Este interceptor:
 * - Envuelve los datos de respuesta en un objeto ApiResponse estandarizado
 * - Añade metadata con timestamp
 * - Mantiene la compatibilidad con respuestas que ya están en el formato correcto
 */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Si la respuesta ya está en el formato ApiResponse, retornarla tal cual
        if (this.isApiResponse(data)) {
          return data;
        }

        // Si es un objeto con mensaje de éxito (ej: { message: "..." })
        // mantenerlo como está pero envuelto en ApiResponse
        if (this.isSimpleMessage(data)) {
          return {
            success: true,
            data,
            metadata: {
              timestamp: new Date().toISOString(),
            },
          };
        }

        if (this.hasPagination(data)) {
          return {
            success: true,
            data: data.data,
            pagination: data.pagination,
            metadata: {
              timestamp: new Date().toISOString(),
            },
          } as ApiResponse<T>;
        }

        // Para arrays, incluir metadata con el total
        if (Array.isArray(data)) {
          return {
            success: true,
            data: data as T,
            metadata: {
              total: data.length,
              timestamp: new Date().toISOString(),
            },
          } as ApiResponse<T>;
        }

        // Para cualquier otro dato, simplemente envolverlo en un objeto plano
        return {
          success: true,
          data: data as T,
          metadata: {
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse<T>;
      }),
    );
  }

  /**
   * Verifica si el objeto ya está en formato ApiResponse
   */
  private isApiResponse(obj: any): obj is ApiResponse {
    return obj && typeof obj === 'object' && 'success' in obj && typeof obj.success === 'boolean';
  }

  /**
   * Verifica si es un mensaje simple (ej: { message: "..." })
   */
  private isSimpleMessage(obj: any): boolean {
    return obj && typeof obj === 'object' && 'message' in obj && Object.keys(obj).length <= 2;
  }

  /**
   * Detecta si la respuesta contiene estructura de paginación estándar
   */
  private hasPagination(obj: any): obj is {
    data: any[];
    pagination: Record<string, any>;
  } {
    return (
      obj &&
      typeof obj === 'object' &&
      Array.isArray(obj.data) &&
      obj.pagination &&
      typeof obj.pagination === 'object' &&
      'page' in obj.pagination &&
      'limit' in obj.pagination &&
      'total' in obj.pagination
    );
  }
}
