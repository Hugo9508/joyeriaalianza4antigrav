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

// Cache en memoria
const memCache = new Map<string, { ts: number; data: any; total?: number; totalPages?: number }>();
const pendingRequests = new Map<string, Promise<{ data: any; total?: number; totalPages?: number }>>();

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
 * Núcleo compartido: pega a WooCommerce y devuelve data + metadata de
 * paginación (headers X-WP-Total/X-WP-TotalPages que manda WC en listados).
 * fetchWooCommerce() (abajo) es un wrapper que descarta la metadata para no
 * romper a los ~10 callers existentes que solo esperan el array/objeto.
 */
async function fetchWooCommerceCore(
  endpoint: string,
  params: Record<string, string> = {},
  method: string = "GET",
  body?: any
): Promise<{ data: any; total?: number; totalPages?: number }> {
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
    return cached;
  }

  if (method.toUpperCase() === "GET" && pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)!;
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
      const total = Number(response.headers.get('x-wp-total')) || undefined;
      const totalPages = Number(response.headers.get('x-wp-totalpages')) || undefined;
      const result = { data, total, totalPages };

      if (method.toUpperCase() === "GET") {
        memCache.set(cacheKey, { ts: Date.now(), ...result });
      }

      return result;
    } catch (err: any) {
      console.error(`FETCH_CRITICAL_FAILURE (${endpoint}):`, err.message);

      if (method.toUpperCase() === "GET" && cached) {
        console.warn(`Fallback a cache expirado para ${endpoint} tras error de red.`);
        return cached;
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

/**
 * Función principal de comunicación con WooCommerce.
 */
export async function fetchWooCommerce(
  endpoint: string,
  params: Record<string, string> = {},
  method: string = "GET",
  body?: any
) {
  const { data } = await fetchWooCommerceCore(endpoint, params, method, body);
  return data;
}

/**
 * Igual que fetchWooCommerce pero además devuelve el total de resultados y
 * de páginas — lo necesita /collections para paginar de verdad en vez de
 * mostrar como máximo los primeros per_page productos.
 */
export async function fetchWooCommerceMeta(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<{ data: any; total: number; totalPages: number }> {
  const { data, total, totalPages } = await fetchWooCommerceCore(endpoint, params, "GET");
  return { data, total: total ?? (Array.isArray(data) ? data.length : 0), totalPages: totalPages ?? 1 };
}
