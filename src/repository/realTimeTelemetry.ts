import { AcmiRepository } from './acmi.ts';

export interface RealTimeTelemetryRepository extends AcmiRepository {
  handshake(): Promise<void>;
}
