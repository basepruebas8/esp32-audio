[README.md](https://github.com/user-attachments/files/22605095/README.md)
# Audio por Internet con ESP32 (Relay + Cliente)

Guía **paso a paso (modo aficionado)** para transmitir audio desde tu **ESP32** por **Internet** y escucharlo en el **móvil** usando un **relay WebSocket** en Render.

---

## Estructura del repositorio

```
tu-repo/
├─ audio-relay/           # Relay WebSocket (Node.js)
│  ├─ server.js
│  ├─ package.json
├─ audio-client/          # Página del móvil (HTML)
│  └─ escucha.html
└─ README.md              # ← este archivo
```

- **audio-relay/**: el “puente” en Internet (reenviará tu audio a los oyentes).
- **audio-client/**: la página web que abrirás en el teléfono para escuchar.

---

## 1) Crear el Relay en Render (Web Service)

1. Crea cuenta en **render.com** y conecta tu GitHub.
2. Sube este repo a GitHub con las carpetas **audio-relay/** y **audio-client/**.
3. En Render: **New → Web Service**.
4. **Source code**: elige tu repo.
5. **Branch**: `main` (o la que uses).
6. **Root Directory**: `audio-relay`
7. **Build Command**: `npm install`
8. **Start Command**: `node server.js`
9. **Environment Variables** → **Add**: `TOKEN=supersecreto` (elige tu valor).
10. Crea el servicio. Render te dará una URL:  
    `https://<tu-servicio>.onrender.com`  
    Tu WebSocket será: `wss://<tu-servicio>.onrender.com`

**Importante – `server.js` debe escuchar el puerto de Render:**
Asegúrate de tener al final de tu `server.js` algo como:
```js
server.listen(process.env.PORT || 10000, '0.0.0.0', () => console.log('WS relay up'));
```
(Si no lo tienes, ponlo así).

**Prueba rápida** (opcional): abre `https://<tu-servicio>.onrender.com/healthz` y debe responder `ok`.

---

## 2) Crear la página del móvil en Render (Static Site)

1. En Render: **New → Static Site**.
2. **Source code**: el mismo repo.
3. **Root Directory**: `audio-client`
4. **Build Command**: *(vacío)*
5. **Publish Directory**: `.`
6. Crea el sitio. Tu URL será:  
   `https://<tu-sitio>.onrender.com/escucha.html`

Abre esa URL en el móvil. Al tocar **Escuchar**, se habilita el audio.

---

## 3) Conectar el ESP32 (emisor)

En tu sketch, conecta el WebSocket **WSS** a esta URL (ejemplo):

```
wss://<tu-servicio>.onrender.com/?room=demo&role=source&token=supersecreto
```

- `room=demo`: nombre de sala (cámbialo si quieres).
- `role=source`: indica que el ESP32 **envía**.
- `token=supersecreto`: debe coincidir con la variable **TOKEN** que pusiste en Render.

**Envío de audio:** cada **20 ms** manda un frame de **PCM16 a 16 kHz** (320 muestras = 640 bytes).  
Más adelante puedes pasar a **μ-law** para usar la mitad de ancho de banda.

---

## 4) Escuchar en el móvil (oyente)

- Abre la página:  
  `https://<tu-sitio>.onrender.com/escucha.html?room=demo`
- En el campo “Servidor WSS” puedes usar:  
  `wss://<tu-servicio>.onrender.com/?room=demo&role=listener`
- Toca **Escuchar / Play**.
- Si la red va inestable, sube el **Buffer de jitter** a **100–140 ms**.

---

## 5) Consejos rápidos

- **HTTPS/WSS** ya vienen listos con Render (no necesitas configurar certificados).
- **TOKEN**: cámbialo de vez en cuando y no lo compartas.
- **Latencia** típica: 80–150 ms con buena conexión móvil/Wi‑Fi.
- **Calidad**: usa High‑Pass 100 Hz y Low‑Pass 4.5 kHz en la página para voz clara.

---

## 6) Problemas comunes

- **No suena al tocar Play**: toca otra vez; los navegadores piden interacción para iniciar audio.
- **Cortes en 4G/5G**: sube el **jitter** (por ejemplo de 80 → 140 ms).
- **No conecta**: revisa la URL WSS (room/role/token) y que el servicio en Render esté “Live”.
- **Distorsión fuerte**: baja el volumen o el compresor en la página.

---

## 7) URLs de ejemplo (pon tu nombre real de servicio)

- **ESP32 (emisor)**  
  `wss://audio-relay-XXXXX.onrender.com/?room=demo&role=source&token=supersecreto`

- **Móvil (oyente)**  
  Página: `https://audio-client-YYYY.onrender.com/escucha.html?room=demo`  
  WSS (en el campo): `wss://audio-relay-XXXXX.onrender.com/?room=demo&role=listener`

---

¡Listo! Con esto puedes clonar el repo, subir a Render y escuchar tu ESP32 desde cualquier lugar.
