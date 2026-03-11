import CircuitBreaker from 'opossum';
import axios, { AxiosRequestConfig } from 'axios';
import { logger } from '../utils/logger';

const circuitBreakerOptions = {
  timeout: 10000,           // 10 seconds timeout
  errorThresholdPercentage: 50,  // Open circuit if 50% of requests fail
  resetTimeout: 30000,      // Try again after 30 seconds
  volumeThreshold: 5,       // Minimum 5 requests before tripping
};

const breakers = new Map<string, CircuitBreaker>();

function getCircuitBreaker(serviceName: string): CircuitBreaker {
  if (!breakers.has(serviceName)) {
    const breaker = new CircuitBreaker(
      async (config: AxiosRequestConfig) => {
        const response = await axios(config);
        return response;
      },
      { ...circuitBreakerOptions, name: serviceName }
    );

    breaker.on('open', () => {
      logger.warn(`Circuit breaker OPENED for ${serviceName}`);
    });

    breaker.on('halfOpen', () => {
      logger.info(`Circuit breaker HALF-OPEN for ${serviceName}`);
    });

    breaker.on('close', () => {
      logger.info(`Circuit breaker CLOSED for ${serviceName}`);
    });

    breaker.on('failure', (err: any) => {
      logger.error(`Circuit breaker FAILURE for ${serviceName}:`, { message: err.message, code: err.code });
    });

    breaker.fallback((err: any) => {
      logger.warn(`Circuit breaker FALLBACK for ${serviceName}:`, { message: err?.message, code: err?.code });
      return {
        status: 503,
        data: { success: false, error: `${serviceName} is currently unavailable. Please try again later.` },
      };
    });

    breakers.set(serviceName, breaker);
  }

  return breakers.get(serviceName)!;
}

export async function proxyRequest(
  serviceName: string,
  serviceUrl: string,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: unknown
) {
  const breaker = getCircuitBreaker(serviceName);

  const axiosConfig: AxiosRequestConfig = {
    method: method as any,
    url: `${serviceUrl}${path}`,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': headers['x-user-id'] || '',
      'x-user-email': headers['x-user-email'] || '',
      'x-user-role': headers['x-user-role'] || '',
      'x-correlation-id': headers['x-correlation-id'] || '',
    },
    data: body,
    timeout: 10000,
    validateStatus: (status: number) => status < 500,
  };

  const response: any = await breaker.fire(axiosConfig);
  return { status: response.status, data: response.data };
}
