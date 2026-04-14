import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy para Google Distance Matrix (Evita CORS e oculta a chave no backend)
  app.get("/api/distance", async (req, res) => {
    const { origins, destinations } = req.query;
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Google Maps API Key não configurada no servidor." });
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Erro no Proxy de Distância:", error);
      res.status(500).json({ error: "Falha ao consultar Google Distance Matrix." });
    }
  });

  // Proxy para Google Geocoding (Evita CORS)
  app.get("/api/geocode", async (req, res) => {
    const { address, latlng } = req.query;
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Google Maps API Key não configurada no servidor." });
    }

    try {
      let url = `https://maps.googleapis.com/maps/api/geocode/json?key=${apiKey}`;
      if (address) url += `&address=${address}`;
      if (latlng) url += `&latlng=${latlng}`;

      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Erro no Proxy de Geocode:", error);
      res.status(500).json({ error: "Falha ao consultar Google Geocoding." });
    }
  });

  // Vite middleware para desenvolvimento
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SK BURGERS: Servidor Full-Stack rodando em http://localhost:${PORT}`);
  });
}

startServer();
