// main.ts — relay sencillo (Deno Deploy)
const rooms = new Map<string, { source: WebSocket | null; listeners: Set<WebSocket> }>();
const getRoom = (id: string) =>
  rooms.get(id) ?? rooms.set(id, { source: null, listeners: new Set() }).get(id)!;

Deno.serve((req: Request) => {
  const url = new URL(req.url);

  // ✅ Salud
  if (url.pathname === "/healthz") return new Response("ok");

  // Página normal si no es WebSocket
  if (req.headers.get("upgrade") !== "websocket") return new Response("ws relay listo");

  // Parámetros
  const room  = url.searchParams.get("room")  ?? "default";
  const role  = url.searchParams.get("role")  ?? "listener";
  const token = url.searchParams.get("token") ?? "";
  const NEED  = Deno.env.get("TOKEN") ?? ""; // opcional

  if (NEED && token !== NEED) return new Response("bad token", { status: 403 });

  // Upgrade a WS
  const { socket, response } = Deno.upgradeWebSocket(req);
  const R = getRoom(room);

  socket.addEventListener("open", () => {
    if (role === "source") { try { R.source?.close(1012, "new source"); } catch {} R.source = socket; }
    else R.listeners.add(socket);
  });

  socket.addEventListener("message", (ev) => {
    if (role !== "source" || typeof ev.data === "string") return;
    for (const cli of R.listeners) try { cli.readyState === 1 && cli.send(ev.data); } catch {}
  });

  socket.addEventListener("close", () => {
    if (role === "source") R.source = null; else R.listeners.delete(socket);
  });

  return response;
});
