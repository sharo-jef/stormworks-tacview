import { AcmiClient, IClient, RealtimeTelemetryClient } from "./client.ts";

const listener = Deno.listen({ port: 42674 });
const clients: IClient[] = [
  new AcmiClient(),
];

Deno.serve({ port: 3000 }, async (req) => {
  const endpoint = req.url.split("{")?.[0];
  if (!endpoint) {
    return new Response("Invalid endpoint");
  }
  const path = endpoint
    .replace(/{.*/g, "")
    .split("/")
    .filter((v, i) => i > 2 && v);
  const data = req.url.match(/{.*}$/)?.[0];

  if (path.length > 0 && path[0] === "server") {
    if (path.length > 1 && path[1] === "post") {
      if (path.length > 2 && path[2] === "connect") {
        return new Response("OK");
      } else if (data) {
        const pageObject = JSON.parse(data);
        for (const client of clients) {
          if (client instanceof RealtimeTelemetryClient && client.closed) {
            clients.splice(clients.indexOf(client), 1);
            continue;
          }
          await client.write(pageObject);
        }
        return new Response("OK");
      }
    } else if (path.length > 1 && path[1] === "start_log") {
      for (const client of clients) {
        if (client instanceof AcmiClient) {
          client.init();
        }
      }
      return new Response("OK");
    } else if (path.length > 1 && path[1] === "stop_log") {
      for (const client of clients) {
        if (client instanceof AcmiClient) {
          client.stop();
        }
      }
      return new Response("OK");
    }
  }
  return new Response("Unknown endpoint");
});

setInterval(() => {
  clients.forEach((client) => {
    client.tick();
  });
}, 17);

for await (const conn of listener) {
  const client = new RealtimeTelemetryClient(conn);
  await client.handshake();
  clients.push(client);
}
