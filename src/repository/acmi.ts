export interface AcmiRepository {
  write(data: PageObject): Promise<void>;
  step(): void;
}
