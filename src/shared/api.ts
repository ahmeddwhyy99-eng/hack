export class ApiError extends Error {
  constructor(message: string, public code: string, public requestId?: string) { super(message) }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  let response: Response
  try { response = await fetch(`/api/verifications${path}`, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: AbortSignal.timeout(15000) }) }
  catch { throw new ApiError('Could not reach the verification service. Please try again.', 'NETWORK_ERROR') }
  let data
  try { data = await response.json() } catch { throw new ApiError('The verification service returned an unreadable response.', 'SERVICE_UNAVAILABLE') }
  if (!response.ok) throw new ApiError(data.error?.message || 'Please try again.', data.error?.code || 'SERVICE_UNAVAILABLE', data.error?.requestId)
  return data as T
}
