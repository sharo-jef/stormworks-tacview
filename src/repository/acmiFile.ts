import { AcmiRepository } from './acmi.ts';

export interface AcmiFileRepository extends AcmiRepository {
  start(): void;
  stop(): Promise<void>;
}
