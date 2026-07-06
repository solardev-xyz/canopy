/**
 * window.radicle provider access.
 *
 * In Freedom Browser the provider is injected into the page; everywhere
 * else (plain-browser dev) it's absent and canopy stays read-only. All
 * provider errors are EIP-1193-style {code, message, data} — normalize
 * them into ProviderError so the UI can branch on codes.
 */

export class ProviderError extends Error {
  constructor(code, message, data) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.data = data;
  }
}

export const USER_REJECTED = 4001;

export function hasProvider() {
  return typeof window !== 'undefined' && typeof window.radicle?.request === 'function';
}

export async function radicleRequest(method, params) {
  if (!hasProvider()) {
    throw new ProviderError(4900, 'window.radicle is not available in this browser');
  }
  try {
    return await window.radicle.request({ method, params });
  } catch (err) {
    throw new ProviderError(err.code ?? -32603, err.message ?? 'Provider error', err.data);
  }
}
