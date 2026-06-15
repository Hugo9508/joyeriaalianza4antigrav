/**
 * @fileOverview Núcleo de integración con WooCommerce REST API.
 * Credenciales via variables de entorno (Vercel) con fallback a vault interno.
 * Seguridad: Este archivo SOLO se ejecuta en el servidor (Node.js).
 */

const TTL_MS = 120_000; // 2 minutos para productos
const CATEGORY_TTL_MS = 3600_000; // 1 hora para categorías
const TIMEOUT_MS = 30_000; // 30 segundos de timeout

export const WOO_BASE_URL = process.env.WOO_BASE_URL || '';
const WOO_CK = process.env.WOO_CONSUMER_KEY || '';
const WOO_CS = process.env.WOO_CONSUMER_SECRET || '';

if (!WOO_BASE_URL || !WOO_CK || !WOO_CS) {
  throw new Error('Credenciales WooCommerce no definidas en .env.local');
}

// Cache en memoria
const memCache = new Map<string, { ts: number; data: any }>();
const pendingRequests = new Map<string, Promise<any>>();

let categorySlugMap: Record<string, number> = {};
let lastCategoryFetch = 0;

function cleanBaseUrl(input: string) {
  if (!input) return '';
  const withProto = input.startsWith("http") ? input : `https://${input}`;
  return withProto.replace(/\/+$/, "");
}

function stableQuery(params: Record<string, string>) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && String(v).length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

export async function getCategoryIdBySlug(slug: string): Promise<string | null> {
  const now = Date.now();
  if (Object.keys(categorySlugMap).length === 0 || (now - lastCategoryFetch > CATEGORY_TTL_MS)) {
    try {
      const categories = await fetchWooCommerce('products/categories', { per_page: '100', hide_empty: 'true' });
      if (Array.isArray(categories)) {
        const newMap: Record<string, number> = {};
        categories.forEach((cat: any) => {
          newMap[cat.slug] = cat.id;
        });
        categorySlugMap = newMap;
        lastCategoryFetch = now;
      }
    } catch (e: any) {
      console.error("Error al refrescar mapa de categorías:", e.message);
    }
  }
  return categorySlugMap[slug]?.toString() || null;
}

/**
 * Función principal de comunicación con WooCommerce.
 */
export async function fetchWooCommerce(
  endpoint: string,
  params: Record<string, string> = {},
  method: string = "GET",
  body?: any
) {
  const base = cleanBaseUrl(WOO_BASE_URL);

  if (!base || !WOO_CK || !WOO_CS) {
    throw new Error("Configuración de WooCommerce no encontrada. Revise variables de entorno o vault interno.");
  }

  const url = new URL(`${base}/wp-json/wc/v3/${endpoint}`);

  if (method.toUpperCase() === "GET") {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }

  const query = stableQuery(Object.fromEntries(url.searchParams.entries()));
  const cacheKey = `${method.toUpperCase()} ${url.origin}${url.pathname}${query ? `?${query}` : ""}`;

  const now = Date.now();
  const cached = memCache.get(cacheKey);

  if (method.toUpperCase() === "GET" && cached && now - cached.ts <= TTL_MS) {
    return cached.data;
  }

  if (method.toUpperCase() === "GET" && pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const fetcher = (async () => {
    const auth = Buffer.from(`${WOO_CK}:${WOO_CS}`).toString("base64");

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          "User-Agent": "JoyeriaAlianza-Frontend/2.0"
        },
        body: method.toUpperCase() === "GET" ? undefined : body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Error desconocido" }));
        console.error(`WOO_API_ERROR [${response.status}]:`, errorData);
        throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      if (method.toUpperCase() === "GET") {
        memCache.set(cacheKey, { ts: Date.now(), data });
      }

      return data;
    } catch (err: any) {
      console.error(`FETCH_CRITICAL_FAILURE (${endpoint}):`, err.message);

      if (method.toUpperCase() === "GET" && cached) {
        console.warn(`Fallback a cache expirado para ${endpoint} tras error de red.`);
        return cached.data;
      }

      throw err;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  if (method.toUpperCase() === "GET") {
    pendingRequests.set(cacheKey, fetcher);
  }

  return fetcher;
}
