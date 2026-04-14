import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { origins, destinations } = req.query;
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Google Maps API Key não configurada no servidor." });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${apiKey}`;
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://skburgers-am.vercel.app/'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Erro no Proxy de Distância:", error);
    res.status(500).json({ error: "Falha ao consultar Google Distance Matrix." });
  }
}
