/**
 * Geocodificacion de direcciones via Nominatim (OpenStreetMap), gratuito.
 *
 * Requiere salida a internet en runtime (funciona en produccion; en entornos
 * de desarrollo sandboxeados sin acceso a internet, geocode() devuelve null
 * y el flujo de asignacion cae a seleccion manual de localidad).
 *
 * Politica de uso de Nominatim: maximo 1 request/seg y un User-Agent
 * identificable. https://operations.osmfoundation.org/policies/nominatim/
 */

export type GeocodeResult = {
  lat: number;
  lng: number;
  localidad: string | null;
  provincia: string | null;
  direccionFormateada: string;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const MIN_INTERVAL_MS = 1100;

let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

export async function geocodeAddress(
  direccion: string,
): Promise<GeocodeResult | null> {
  const query = direccion.trim();
  if (!query) return null;

  await throttle();

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "ar");

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": process.env.NOMINATIM_USER_AGENT ?? "turina-crm/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`Geocoding fallo con status ${res.status} para "${query}"`);
      return null;
    }

    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      address?: Record<string, string>;
    }>;

    if (data.length === 0) return null;

    const first = data[0];
    const address = first.address ?? {};
    const localidad =
      address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      address.county ??
      null;

    return {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      localidad,
      provincia: address.state ?? null,
      direccionFormateada: first.display_name,
    };
  } catch (err) {
    console.warn(`Geocoding no disponible para "${query}":`, err);
    return null;
  }
}
