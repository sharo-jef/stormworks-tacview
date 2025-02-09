import type { AcmiRepository } from './repository/acmi.ts';
import { ProdRealTimeTelemetryRepository } from './infra/realTimeTelemetry.ts';
import { ProdAcmiFileRepository } from './infra/acmiFile.ts';

const listener = Deno.listen({ port: 42674 });
const acmis: AcmiRepository[] = [
  new ProdAcmiFileRepository(),
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
  if (path.length > 0 && path[0] === 'tacview') {
    if (path.length > 1) {
      if (path[1] === 'start') {
        for (const acmi of acmis) {
          if (acmi instanceof ProdAcmiFileRepository) {
            acmi.start();
          }
        }
      } else if (path[1] === 'stop') {
        for (const acmi of acmis) {
          if (acmi instanceof ProdAcmiFileRepository) {
            await acmi.stop();
          }
        }
      } else {
        return new Response('Unknown endpoint');
      }
    } else {
      if (data) {
        for (const acmi of acmis) {
          await acmi.write(JSON.parse(data));
        }
      } else {
        return new Response('Invalid data');
      }
    }
  }
  return new Response('OK');
});

for await (const conn of listener) {
  const realTimeTelemetry = new ProdRealTimeTelemetryRepository(conn);
  await realTimeTelemetry.handshake();
  acmis.push(realTimeTelemetry);
}
