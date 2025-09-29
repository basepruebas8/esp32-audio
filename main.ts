// main.ts — Relay muy simple para audio (Deno Deploy)
// Usa ?room=demo&role=source|listener&token=loquesea

// Guardamos quién envía (source) y quién escucha (listeners) por sala.
const rooms = new Map<string, { source: WebSocket | null; listeners: Set<WebSocket> }>();
function getRoom(id: string) {
  if (!rooms.has(id)) rooms.set(id, { source: null, listeners: new Set() });
  return rooms.get(id)!;
}

// Servidor HTTP/WS (Deno lo expone en tu *.deno.dev)
Deno.serve((req: Request) => {
  const url = new URL(req.url);
  if (url.pathname === "/healthz") return new Response("ok"); // para probar

  // Si no es WebSocket, solo respondemos un texto
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("ws relay listo");
  }

  // Parámetros de la URL
  const room  = url.searchParams.get("room")  ?? "default";
  const role  = url.searchParams.get("role")  ?? "listener";
  const token = url.searchParams.get("token") ?? "";
  const NEED  = Deno.env.get("TOKEN"); // opcional: si lo pones en Deno Deploy

  if (NEED && token !== NEED) return new Response("bad token", { status: 403 });

  // Convertimos la conexión a WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);
  const R = getRoom(room);

  socket.addEventListener("open", () => {
    if (role === "source") {
      try { R.source?.close(1012, "new source"); } catch {}
      R.source = socket;
    } else {
      R.listeners.add(socket);
    }
  });

  socket.addEventListener("message", (ev) => {
    // Solo reenviamos binario que manda el "source"
    if (role !== "source" || typeof ev.data === "string") return;
    for (const cli of R.listeners) {
      try { if (cli.readyState === 1) cli.send(ev.data); } catch {}
    }
  });

  socket.addEventListener("close", () => {
    if (role === "source") R.source = null;
    else R.listeners.delete(socket);
  });

  return response;
});
