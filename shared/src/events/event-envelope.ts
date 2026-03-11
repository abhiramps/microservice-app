export interface EventEnvelope<T = unknown> {
  eventId: string;
  type: string;
  timestamp: string;
  correlationId: string;
  payload: T;
}

export function createEventEnvelope<T>(
  type: string,
  payload: T,
  correlationId: string
): EventEnvelope<T> {
  return {
    eventId: require('crypto').randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    correlationId,
    payload,
  };
}
