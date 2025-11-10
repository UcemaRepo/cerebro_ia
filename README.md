# 🧠 Cerbero OpenAI

Servidor proxy seguro para conectar tu extensión o bot con OpenAI sin sufrir bloqueos CORS.

## 🚀 Instalación local

```bash
npm install
npm start
```

Luego probá en tu navegador:
```
http://localhost:3000
```

## 🧩 Uso desde el front-end

Para analizar texto:

```js
fetch("http://localhost:3000/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "gpt-4.1-mini",
    messages: [
      { role: "user", content: "Hola Cerbero, ¿estás ahí?" }
    ]
  })
});
```

Para analizar imágenes (en base64):

```js
fetch("http://localhost:3000/api/analyze-image", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    base64: "data:image/png;base64,iVBORw0K...",
    prompt: "Explica el contenido de la imagen"
  })
});
```

## ☁️ Deploy en Render

1. Sube la carpeta a GitHub.  
2. En [Render.com](https://render.com), elige “New Web Service”.  
3. Conecta tu repo y en **Environment** agrega:
   ```
   OPENAI_API_KEY=sk-proj-XXXX
   ```
4. Deploy y listo ✅
