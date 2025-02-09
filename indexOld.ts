import 'jsr:@std/dotenv/load';

import { AcmiClient, IClient, RealtimeTelemetryClient } from './client.ts';
import { SteamRepository } from './steam.ts';

// TODO: Read the API key from environment variables
const STEAM_API_KEY = Deno.env.get('STEAM_API_KEY');
if (!STEAM_API_KEY) {
  throw new Error('STEAM_API_KEY is not set');
}
const steamRepository = new SteamRepository(STEAM_API_KEY);
const listener = Deno.listen({ port: 42674 });
const clients: IClient[] = [
  new AcmiClient(steamRepository),
];

Deno.serve({ port: 3000 }, async (req) => {
  const endpoint = req.url.split('{')?.[0];
  if (!endpoint) {
    return new Response('Invalid endpoint');
  }
  const path = endpoint
    .replace(/{.*/g, '')
    .split('/')
    .filter((v, i) => i > 2 && v);
  const data = req.url.match(/{.*}$/)?.[0];

  if (path.length > 0 && path[0] === 'server') {
    if (path.length > 1 && path[1] === 'post') {
      if (path.length > 2 && path[2] === 'connect') {
        console.log('Connected');
        return new Response('OK');
      } else if (data) {
        const pageObject = JSON.parse(data);
        for (const client of clients) {
          if (client instanceof RealtimeTelemetryClient && client.closed) {
            clients.splice(clients.indexOf(client), 1);
            continue;
          }
          await client.write(pageObject);
        }
        return new Response('OK');
      }
    } else if (path.length > 1 && path[1] === 'start_log') {
      for (const client of clients) {
        if (client instanceof AcmiClient) {
          await client.init();
        }
      }
      return new Response('OK');
    } else if (path.length > 1 && path[1] === 'stop_log') {
      for (const client of clients) {
        if (client instanceof AcmiClient) {
          await client.stop();
        }
      }
      return new Response('OK');
    }
  }
  return new Response('Unknown endpoint');
});

setInterval(() => {
  clients.forEach((client) => {
    client.tick();
  });
}, 17);

for await (const conn of listener) {
  const client = new RealtimeTelemetryClient(conn, steamRepository);
  await client.handshake();
  clients.push(client);
}
