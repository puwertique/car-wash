type GeocodingResult = {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
};

/** Geocodes once during order creation; dispatch only reads stored coordinates. */
export async function geocodeAddress(
  city: string,
  address: string,
): Promise<GeocodingResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const query = encodeURIComponent(`${city}, ${address}`);
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${encodeURIComponent(apiKey)}`,
    { cache: "no-store" },
  );

  if (!response.ok) return null;
  const payload = (await response.json()) as {
    status: string;
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat: number; lng: number } };
    }>;
  };

  const location = payload.results?.[0]?.geometry?.location;
  if (payload.status !== "OK" || !location) return null;

  return {
    latitude: location.lat,
    longitude: location.lng,
    formattedAddress: payload.results?.[0]?.formatted_address,
  };
}
