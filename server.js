import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import bodyParser from "body-parser";

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "25mb" }));

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();

if (!OPENAI_API_KEY) {
  console.error("❌ ERROR: Falta la API key de OpenAI. Definila en Render como variable de entorno.");
  process.exit(1);
}

// === Endpoint para texto ===
app.post("/api/chat", async (req, res) => {
  try {
    const payload = req.body;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Endpoint para imágenes ===
app.post("/api/analyze-image", async (req, res) => {
  try {
    const { base64, prompt = "Describe detalladamente esta imagen" } = req.body;

    console.log("📦 Longitud base64 recibida:", base64?.length || 0);

    // Detectar si es una DataURL (data:image/png;base64,...)
    const imagePayload = base64.startsWith("data:image/")
      ? { type: "input_image", image_url: base64 } // soporta dataURL correctamente
      : { type: "input_image", image_url: `data:image/png;base64,${base64}` };

    const payload = {
      model: "gpt-5",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            imagePayload
          ]
        }
      ]
    };

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("❌ Error en respuesta OpenAI:", data);
      return res.status(400).json({ error: data });
    }

    console.log("✅ Respuesta OpenAI:", data.output_text || data.output?.[0]?.content?.[0]?.text);
    res.json(data);
  } catch (err) {
    console.error("💥 Error en /api/analyze-image:", err);
    res.status(500).json({ error: err.message });
  }
});


// === Ping de salud ===
app.get("/", (req, res) => {
  res.send("🧠 Cerbero OpenAI activo y listo.");
});
console.log("🧠 OPENAI_API_KEY:", JSON.stringify(OPENAI_API_KEY));



app.listen(PORT, () => console.log(`✅ Servidor Cerbero activo en puerto ${PORT}`));
