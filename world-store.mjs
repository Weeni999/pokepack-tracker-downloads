import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';

const starterChicken = () => ({
  id: `bird-${randomUUID()}`, name: 'Cluck Norris', rarity: 'common', isGuaranteedStarter: true,
  stats: { power: 12, speed: 10, armor: 9, stamina: 14, aggression: 11 },
  specialMove: { id: 'scrapstorm', name: 'Scrapstorm', cooldownSeconds: 18 },
  condition: { hunger: 14, rest: 92, injury: 0 }, upgrades: { coopTier: 1, incomeTier: 0 },
  visual: { body: '0', head: '0', wings: '0', legs: '0', tail: '0', hat: 'none', neckWear: 'none', finish: '#315b47', secondary: '#82938f', panelColor: '#17201f', trimColor: '#b68a4d', bootColor: '#a86638', lens: '#00ff66', wear: 20 },
  acquiredAt: Date.now()
});

const freshState = () => ({
  schemaVersion: 1,
  sessionSecret: randomBytes(32).toString('hex'),
  clockEpoch: Date.now(),
  players: {},
  plots: Array.from({ length: 12 }, (_, i) => ({ id: `plot-${String(i + 1).padStart(2, '0')}`, ownerId: null, upgrades: {}, decorations: [], objects: [] })),
  arena: { history: [], leaderboard: [], scheduledEventId: null },
  media: { playlistId: '', trackIds: [], order: [], seed: 0, trackIndex: 0, trackStartedAt: Date.now(), visualStartedAt: Date.now(), durationByVideoId: {}, unavailableIds: [], votes: {}, voteStartedAt: 0, voteCooldownUntil: 0 }
});

export class WorldStore {
  #path; #state; #queue = Promise.resolve();
  constructor(path) { this.#path = path; }
  async load() {
    await mkdir(dirname(this.#path), { recursive: true });
    try { this.#state = JSON.parse(await readFile(this.#path, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      this.#state = freshState(); await this.#write();
    }
    this.#state.schemaVersion = 2;this.#state.socialReports ||= [];this.#state.lobbyEscrows ||= {}; this.#state.players ||= {}; this.#state.plots ||= freshState().plots; this.#state.arena ||= { history: [], leaderboard: [] };
    const priorMedia = this.#state.media || {};
    this.#state.media = {
      playlistId: typeof priorMedia.playlistId === 'string' ? priorMedia.playlistId : '',
      trackIds: Array.isArray(priorMedia.trackIds) ? priorMedia.trackIds : [],
      order: Array.isArray(priorMedia.order) ? priorMedia.order : [],
      seed: Number(priorMedia.seed) || 0,
      trackIndex: Number.isSafeInteger(priorMedia.trackIndex) ? priorMedia.trackIndex : 0,
      trackStartedAt: Number(priorMedia.trackStartedAt) || Date.now(),
      visualStartedAt: Number(priorMedia.visualStartedAt) || Date.now(),
      durationByVideoId: priorMedia.durationByVideoId && typeof priorMedia.durationByVideoId === 'object' ? priorMedia.durationByVideoId : {},
      unavailableIds: Array.isArray(priorMedia.unavailableIds) ? priorMedia.unavailableIds : [],
      votes: priorMedia.votes && typeof priorMedia.votes === 'object' ? priorMedia.votes : {},
      voteStartedAt: Number(priorMedia.voteStartedAt) || 0,
      voteCooldownUntil: Number(priorMedia.voteCooldownUntil) || 0
    };
    if (!this.#state.sessionSecret) this.#state.sessionSecret = randomBytes(32).toString('hex');
    return this;
  }
  get secret() { return this.#state.sessionSecret; }
  get world() { return this.#state; }
  getPlayer(id) { return this.#state.players[id] || null; }
  createPlayer(id) {
    if (this.#state.players[id]) return this.#state.players[id];
    const plot = this.#state.plots.find(p => !p.ownerId);
  const record = { id, name: `Yardhand-${id.slice(0, 4).toUpperCase()}`, createdAt: Date.now(), lastSeenAt: Date.now(), position: { x: -2.5, y: 0, z: -34, yaw: Math.PI }, zone: 'corridor', plotId: plot?.id || null, credits: 250, scrap: 12, betLimit: 100, chickens: [starterChicken()], companionId: null, robotLookCode: '', skinUnlocks: ['none','nocturne-couture','chrome-fang','sanguine-spray','vein-runner','coffin-puffer'], accessoryUnlocks: { mask:[0], gloves:[0], belt:[0], back:[0], overlay:[0] }, robotCosmetics: {}, settings: {}, entryPending: true, movementSeq: 0, commands: {} };
    this.#state.players[id] = record; if (plot) plot.ownerId = id; return record;
  }
  async commit(mutator) {
    const run = async () => { const result = await mutator(this.#state); await this.#write(); return result; };
    const result = this.#queue.then(run); this.#queue = result.catch(() => {}); return result;
  }
  async save() { return this.commit(() => true); }
  async #write() {
    const temp = `${this.#path}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(this.#state, null, 2), 'utf8');
    await rename(temp, this.#path);
  }
}

export { starterChicken };
