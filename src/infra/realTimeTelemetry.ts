import type { RealTimeTelemetryRepository } from '../repository/realtimeTelemetry.ts';
import { ProdAcmiRepository } from './acmi.ts';

export class ProdRealTimeTelemetryRepository extends ProdAcmiRepository
  implements RealTimeTelemetryRepository {
  closed = false;

  constructor(private readonly conn: Deno.Conn) {
    super();
  }

  async write(page: PageObject) {
    if (this.closed) {
      return;
    }
    try {
      const acmi = this.writeAcmi(page);
      await this.conn.write(new TextEncoder().encode(acmi));
    } catch (err) {
      this.closed = true;
      if (err instanceof Deno.errors.ConnectionAborted) {
        console.log('Connection closed by client');
      } else {
        console.error('Unexpected error:', err);
      }
      this.conn.close();
    }
  }

  async handshake() {
    const startDate = new Date();
    try {
      const handshakeResponse =
        `XtraLib.Stream.0\nTacview.RealTimeTelemetry.0\nHost stormworks\n\0`;
      await this.conn.write(new TextEncoder().encode(handshakeResponse));

      const buf = new Uint8Array(1024);
      await this.conn.read(buf);
      const clientHandshake = new TextDecoder().decode(buf);
      console.log(clientHandshake);

      const header = `FileType=text/acmi/tacview
FileVersion=2.2
0,ReferenceTime=${startDate.toISOString()}
0,RecordingTime=${startDate.toISOString()}
0,Title=StormworksACMI
0,DataRecorder=StormworksACMI 0.0.1
0,DataSource=Stormworks
0,Author=mokoko
0,ReferenceLongitude=180
0,ReferenceLatitude=0
40000003,T=0|0|2000|0|0,Type=Navaid+Static+Bullseye,Color=Blue,Coalition=Allies
#0.001
`;

      await this.conn.write(new TextEncoder().encode(header));
    } catch (err) {
      this.closed = true;
      console.error('Unexpected error:', err);
      this.conn.close();
    }
  }
}
