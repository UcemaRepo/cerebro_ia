import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import bodyParser from "body-parser";

dotenv.config();
const app = express();

// ✅ CORS completamente abierto (para desarrollo y extensiones)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(bodyParser.json({ limit: "25mb" }));

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();

if (!OPENAI_API_KEY) {
  console.error("❌ Falta la API key de OpenAI");
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
// === Endpoint para imágenes ===
app.post("/api/analyze-image", async (req, res) => {
  try {
    const { base64, prompt = "Describe detalladamente esta imagen" } = req.body;

    if (!base64) {
      return res.status(400).json({ error: "No se recibió la imagen base64" });
    }

    console.log("📦 Longitud base64 recibida:", base64.length);

    const payload = {
      model: "gpt-5",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: base64 }
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

    // 🧠 Extraer texto de forma segura según estructura /v1/responses real
    let textOutput = "⚠️ No se pudo interpretar la respuesta del modelo.";

    try {
      if (data.output_text) {
        textOutput = data.output_text;
      } 
      else if (Array.isArray(data.output)) {
        for (const item of data.output) {
          if (Array.isArray(item.content)) {
            for (const block of item.content) {
              if (block.type === "output_text" && block.text) {
                textOutput = block.text;
                break;
              }
            }
          }
        }
      } 
      else if (data.output?.[0]?.content?.[0]?.text) {
        textOutput = data.output[0].content[0].text;
      } 
      else if (data.choices?.[0]?.message?.content) {
        textOutput = data.choices[0].message.content;
      } 
    } catch (extractErr) {
      console.warn("⚠️ Error interpretando respuesta:", extractErr);
    }

    console.log("✅ Respuesta OpenAI interpretada:", textOutput);
    res.json({ text: textOutput, raw: data });

  } catch (err) {
    console.error("❌ Error en /api/analyze-image:", err);
    res.status(500).json({ error: err.message });
  }
});

// === Endpoint para analizar archivos CSV ===
app.post("/api/analyze-csv", async (req, res) => {
  try {
    const { base64, prompt = "Analiza este archivo CSV y describe sus principales patrones o conclusiones." } = req.body;

    if (!base64) return res.status(400).json({ error: "No se recibió el CSV en base64." });

    // Convertimos base64 -> texto
    const csvText = Buffer.from(base64.split(",")[1] || base64, "base64").toString("utf-8");
    console.log(`📊 CSV recibido (${csvText.length} caracteres)`);

    const payload = {
      model: "gpt-5",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: `${prompt}\n\nContenido del CSV:\n${csvText.slice(0, 10000)}` } // límite para no exceder tokens
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

    let textOutput = "⚠️ No se pudo interpretar la respuesta del modelo.";
    if (data.output_text) textOutput = data.output_text;
    else if (data.output?.[0]?.content?.[0]?.text) textOutput = data.output[0].content[0].text;
    else if (data.choices?.[0]?.message?.content) textOutput = data.choices[0].message.content;

    console.log("✅ Respuesta CSV interpretada:", textOutput.slice(0, 300));
    res.json({ text: textOutput, raw: data });

  } catch (err) {
    console.error("❌ Error analizando CSV:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/convert-image-to-csv", async (req, res) => {
  try {
    const { base64 } = req.body;
    if (!base64) return res.status(400).json({ error: "No se recibió la imagen." });

    console.log("🖼️ Solicitando conversión de imagen a CSV...");

    const payload = {
      model: "gpt-5",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Extraé toda la información tabular o estructurada de esta imagen y devolvela en formato CSV (con encabezados y valores limpios)." },
            { type: "input_image", image_url: base64 }
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
    if (!r.ok) return res.status(400).json({ error: data });

    const csvText =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      data.choices?.[0]?.message?.content ||
      "⚠️ No se pudo extraer texto CSV.";

    res.json({ csv: csvText });
  } catch (err) {
    console.error("❌ Error en conversión a CSV:", err);
    res.status(500).json({ error: err.message });
  }
});

// === 🧠 Memoria persistente del Cerebro ===
import fs from "fs";

const MEMORY_FILE = "./cerebro_memory.json";

// Cargar memoria inicial
let memory = {};
try {
  if (fs.existsSync(MEMORY_FILE)) {
    memory = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf-8"));
    console.log(`🧠 Memoria cargada (${Object.keys(memory).length} entradas)`);
  }
} catch (err) {
  console.error("⚠️ Error cargando memoria:", err);
  memory = {};
}

// Guardar memoria en disco
function saveMemory() {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// Guardar contenido procesado (texto)
app.post("/api/memory/save", (req, res) => {
  const { id, type, summary, raw } = req.body;
  if (!id || !summary) return res.status(400).json({ error: "Faltan datos para guardar." });

  memory[id] = {
    id,
    type,
    summary,
    raw: raw || null,
    timestamp: new Date().toISOString()
  };

  saveMemory();
  console.log(`💾 Guardado en memoria: ${id} (${type})`);
  res.json({ ok: true });
});

// Recuperar todo
app.get("/api/memory/all", (req, res) => res.json(Object.values(memory)));

// Recuperar por id
app.get("/api/memory/:id", (req, res) => {
  const item = memory[req.params.id];
  if (!item) return res.status(404).json({ error: "No encontrado" });
  res.json(item);
});


// === Ping de salud ===
app.get("/", (req, res) => {
  res.send("🧠 Cerbero OpenAI activo y listo.");
});
console.log("🧠 OPENAI_API_KEY:", JSON.stringify(OPENAI_API_KEY));



app.listen(PORT, () => console.log(`✅ Servidor Cerbero activo en puerto ${PORT}`));
