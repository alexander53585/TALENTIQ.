import express from "express";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));

// ── Servir archivos estáticos del build de Vite ──────────────────────────────
app.use(express.static(path.join(__dirname, "dist")));

// ── Proxy seguro hacia Anthropic ─────────────────────────────────────────────
// El frontend llama a /api/anthropic/v1/messages (mismo path que en dev)
app.post("/api/anthropic", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || "";

  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada en el servidor" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("[proxy] Error llamando a Anthropic:", err.message);
    return res.status(500).json({ error: "Error interno del proxy", details: err.message });
  }
});

// ── SPA fallback: todas las rutas devuelven index.html ───────────────────────
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ KultuRH corriendo en http://localhost:${PORT}`);
});
