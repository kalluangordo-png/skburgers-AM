import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { address, latlng } = req.query;
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Google Maps API Key não configurada no servidor." });
  }

  try {
    let url = `https://maps.googleapis.com/maps/api/geocode/json?key=${apiKey}`;
    if (address) url += `&address=${address}`;
    if (latlng) url += `&latlng=${latlng}`;

    const response = await fetch(url, {
      headers: {
        'Referer': 'https://skburgers-am.vercel.app/'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Erro no Proxy de Geocode:", error);
    res.status(500).json({ error: "Falha ao consultar Google Geocoding." });
  }
}
