import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import test from "node:test";
import vm from "node:vm";
import { RelayPool } from "applesauce-relay";
import { RelayClient } from "../lib/relay-client.ts";
import ts from "typescript";
import { DAY_MS, completedRange, parseStatsEvent, reportWins } from "../lib/stats-reports.ts";

const source = readFileSync(new URL("../app/stats/page.tsx", import.meta.url), "utf8");
const file = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set(["fetchStatsSnapshots", "createPool", "createAbortError", "normalizeRelayUrl", "createInitialRelayStatuses"]);
const declarations = file.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name && names.has(node.name.text));
const code = ts.transpileModule(declarations.map((node) => node.getText(file)).join("\n") + "\nexports.fetch = fetchStatsSnapshots;", {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

async function delayedHandshake(t) {
  const sockets = new Set();
  const upgrades = new Set();
  const clients = [];
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.once("data", (request) => {
      const key = request.toString().match(/Sec-WebSocket-Key:\s*(.+)/i)?.[1]?.trim();
      const timer = setTimeout(() => {
        upgrades.delete(timer);
        if (socket.destroyed) return;
        const accept = createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
        socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
        socket.on("data", (frame) => { if ((frame[0] & 15) === 8) socket.end(Buffer.from([0x88, 0])); });
      }, 600);
      upgrades.add(timer);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    for (const timer of upgrades) clearTimeout(timer);
    for (const client of clients) client.close();
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  });
  class TrackedWebSocket extends WebSocket {
    constructor(...args) { super(...args); clients.push(this); }
  }
  const transport = new RelayPool({ WebSocket: TrackedWebSocket, keepAlive: 0 });
  t.after(() => transport.close());
  const context = {
    exports: {}, RELAYS: [`ws://127.0.0.1:${server.address().port}`], ANALYTICS_KIND: 38422,
    DAY_MS, completedRange, parseStatsEvent, reportWins, Date, URL, DOMException,
    createPool: () => new RelayClient(transport),
    setTimeout: (callback, delay) => setTimeout(callback, delay / 100), clearTimeout,
  };
  vm.runInNewContext(code, context);
  return { fetch: context.exports.fetch, clients, sockets };
}

test("the page deadline closes native sockets still waiting for a WebSocket handshake", async (t) => {
  const h = await delayedHandshake(t);
  const result = await h.fetch({});
  assert.equal(result.historyIncomplete, true);
  await new Promise((resolve) => setTimeout(resolve, 700));
  assert.ok(h.clients.length > 0);
  assert.equal(h.clients.filter((socket) => socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN).length, 0, JSON.stringify({ states: h.clients.map((socket) => socket.readyState), serverSockets: h.sockets.size, resources: process.getActiveResourcesInfo() }));
  assert.equal(h.sockets.size, 0);
  t.diagnostic(JSON.stringify({ clientStates: h.clients.map((socket) => socket.readyState), serverSockets: h.sockets.size, resources: process.getActiveResourcesInfo() }));
});

test("user cancellation closes native sockets still waiting for a WebSocket handshake", async (t) => {
  const h = await delayedHandshake(t);
  const controller = new AbortController();
  const result = h.fetch({}, controller.signal);
  setTimeout(() => controller.abort(), 30);
  await assert.rejects(result, { name: "AbortError" });
  await new Promise((resolve) => setTimeout(resolve, 700));
  assert.ok(h.clients.length > 0);
  assert.equal(h.clients.filter((socket) => socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN).length, 0, JSON.stringify({ states: h.clients.map((socket) => socket.readyState), serverSockets: h.sockets.size, resources: process.getActiveResourcesInfo() }));
  assert.equal(h.sockets.size, 0);
  t.diagnostic(JSON.stringify({ clientStates: h.clients.map((socket) => socket.readyState), serverSockets: h.sockets.size, resources: process.getActiveResourcesInfo() }));
});
