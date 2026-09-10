import { openDB } from 'idb';
import { IDENTITY_TRANSFORM } from '../types';
import type { ModelTransform, RecentModel } from '../types';

export const MAX_RECENTS = 10;
const database = () => openDB('printscope', 1, {
  upgrade(db) {
    db.createObjectStore('models', { keyPath: 'id' });
    db.createObjectStore('settings');
  },
});

export const trimLRU = <T extends { lastOpened: number }>(items: T[], limit = MAX_RECENTS) =>
  [...items].sort((a, b) => b.lastOpened - a.lastOpened).slice(0, limit);

export async function saveModel(model: RecentModel) {
  const db = await database();
  await db.put('models', model);
  const all = await db.getAll('models') as RecentModel[];
  const expired = all.sort((a, b) => b.lastOpened - a.lastOpened).slice(MAX_RECENTS);
  await Promise.all(expired.map((item) => db.delete('models', item.id)));
}

export async function updateModelTransform(id: string, transform: ModelTransform) {
  const db = await database();
  const model = await db.get('models', id) as RecentModel | undefined;
  if (model) await db.put('models', { ...model, transform });
}

export async function recentModels() {
  const models = await (await database()).getAll('models') as (RecentModel & { orientation?: number[] })[];
  return trimLRU(models.map((model) => ({
    ...model,
    transform: model.transform ?? {
      ...IDENTITY_TRANSFORM,
      quaternion: (model.orientation?.length === 4 ? model.orientation : [0, 0, 0, 1]) as ModelTransform['quaternion'],
    },
  })));
}
export async function removeModel(id: string) { await (await database()).delete('models', id); }
export async function setting<T>(key: string, fallback: T): Promise<T> {
  return (await (await database()).get('settings', key) as T | undefined) ?? fallback;
}
export async function setSetting<T>(key: string, value: T) {
  await (await database()).put('settings', value, key);
}
