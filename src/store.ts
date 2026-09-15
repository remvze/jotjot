import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import { JSONFilePreset } from 'lowdb/node';

export interface Note {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

interface Database {
  notes: Note[];
}

export async function createStore() {
  const path =
    process.env.JOTJOT_DATA_FILE ?? join(homedir(), '.jotjot', 'db.json');
  await mkdir(dirname(path), { recursive: true });
  return JSONFilePreset<Database>(path, { notes: [] });
}
