import { Configuration } from '@kibocommerce/rest-sdk';

export default async function apiFetch(
  configuration: Configuration,
  { path, method = 'GET', body }: { path: string; method: string; body?: any },
): Promise<Response> {
  const tenantHost = await configuration.getBaseAPIUrl();
  const url = `${tenantHost}${path}`;
  const headers = {
    ...configuration.headers,
    'Content-Type': 'application/json',
  } as any;
  const authToken = await (
    configuration.accessToken as () => Promise<string>
  )();
  headers.Authorization = `Bearer ${authToken}`;
  const init = {
    method,
    headers,
  } as any;
  if (body && method !== 'GET') {
    init.body = typeof body === 'object' ? JSON.stringify(body) : body;
  }
  return configuration.fetchApi(url, init);
}
