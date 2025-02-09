import axios from 'npm:axios';

export class SteamRepository {
  private readonly personanameCache = new Map<string, string>();
  private readonly queue: string[] = [];

  constructor(private readonly apiKey: string) {}

  getPersonaname(steamId: string): string {
    if (this.personanameCache.has(steamId)) {
      return this.personanameCache.get(steamId)!;
    }
    // 非同期でキャッシュ
    if (!this.queue.includes(steamId)) {
      this.queue.push(steamId);
      this.cachePersonaname(steamId);
    }
    return 'unknown';
  }

  async cachePersonaname(steamId: string): Promise<void> {
    if (this.personanameCache.has(steamId)) {
      return;
    }
    const response = await axios.get(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${this.apiKey}&steamids=${steamId}`,
    );
    const personaname = response.data.response.players?.[0]?.personaname;
    if (!personaname) {
      throw new Error('Failed to get personaname');
    }
    this.personanameCache.set(steamId, personaname);
    this.queue.splice(this.queue.indexOf(steamId), 1);
    console.log(`Personaname is cached: ${personaname}`);
  }
}
