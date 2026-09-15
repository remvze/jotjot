import { confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import Fuse from 'fuse.js';
import { nanoid } from 'nanoid';

import pkg from '../package.json';
import { createStore, type Note } from './store';

const ID_LENGTH = 8;

function relativeTime(timestamp: string): string {
  const elapsed = Date.now() - new Date(timestamp).getTime();
  const future = elapsed < 0;
  const seconds = Math.round(Math.abs(elapsed) / 1000);
  if (seconds < 10) return 'just now';

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ];
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  for (const [unit, size] of units) {
    if (seconds >= size) {
      return formatter.format(
        Math.round(seconds / size) * (future ? 1 : -1),
        unit,
      );
    }
  }
  return 'just now';
}

function printNotes(notes: Note[]): void {
  if (notes.length === 0) {
    console.log(chalk.yellow('No notes found.'));
    return;
  }
  const timeWidth = Math.max(
    ...notes.map(note => relativeTime(note.createdAt).length),
  );
  for (const note of notes) {
    console.log(
      `${chalk.cyan(note.id)}  ${chalk.dim(relativeTime(note.createdAt).padEnd(timeWidth))}  ${note.text}`,
    );
  }
}

function textFrom(words: string[]): string {
  return words.join(' ').trim();
}

function noteLabel(note: Note): string {
  const text =
    note.text.length > 60 ? `${note.text.slice(0, 57)}...` : note.text;
  return `${chalk.cyan(note.id)}  ${text}`;
}

async function resolveNote(notes: Note[], idPrefix: string): Promise<Note> {
  const exact = notes.find(note => note.id === idPrefix);
  if (exact) return exact;

  const matches = notes.filter(note => note.id.startsWith(idPrefix));
  if (matches.length === 0) throw new Error(`Note ${idPrefix} was not found.`);
  if (matches.length === 1) return matches[0];

  return select({
    message: `Multiple notes match “${idPrefix}”. Choose one:`,
    choices: matches.map(note => ({ name: noteLabel(note), value: note })),
  });
}

const program = new Command();

program
  .name('jot')
  .description('Jot down a thought, fast.')
  .version(pkg.version)
  .showHelpAfterError();

program
  .command('list')
  .alias('ls')
  .description('List notes, newest first')
  .action(async () => {
    const store = await createStore();
    printNotes(
      [...store.data.notes].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    );
  });

program
  .command('find')
  .alias('f')
  .description('Fuzzy-search notes')
  .argument('<query...>', 'words to find')
  .action(async (query: string[]) => {
    const store = await createStore();
    const fuse = new Fuse(store.data.notes, {
      keys: ['text'],
      threshold: 0.5,
      ignoreLocation: true,
    });
    printNotes(fuse.search(textFrom(query)).map(result => result.item));
  });

program
  .command('edit')
  .description('Edit a note')
  .argument('<id>', 'note ID')
  .argument('[text...]', 'replacement text')
  .action(async (id: string, words: string[]) => {
    const store = await createStore();
    const note = await resolveNote(store.data.notes, id);

    const suppliedText = textFrom(words);
    const text =
      suppliedText || (await input({ message: 'Note:', default: note.text }));
    if (!text.trim()) throw new Error('A note cannot be empty.');

    note.text = text.trim();
    note.updatedAt = new Date().toISOString();
    await store.write();
    console.log(
      `${chalk.green('Updated')} ${chalk.dim('·')} ${chalk.cyan(note.id)}`,
    );
  });

program
  .command('remove')
  .alias('rm')
  .description('Remove a note')
  .argument('<id>', 'note ID')
  .option('-f, --force', 'skip confirmation')
  .action(async (id: string, options: { force?: boolean }) => {
    const store = await createStore();
    const note = await resolveNote(store.data.notes, id);

    if (!options.force) {
      const approved = await confirm({
        message: `Remove “${note.text}”?`,
      });
      if (!approved) {
        console.log(chalk.yellow('Kept.'));
        return;
      }
    }

    store.data.notes.splice(store.data.notes.indexOf(note), 1);
    await store.write();
    console.log(
      `${chalk.green('Removed')} ${chalk.dim('·')} ${chalk.cyan(note.id)}`,
    );
  });

program
  .argument('[text...]', 'note to create')
  .action(async (words: string[]) => {
    const text = textFrom(words);
    if (!text) {
      program.help();
      return;
    }

    const store = await createStore();
    const now = new Date().toISOString();
    const note: Note = {
      id: nanoid(ID_LENGTH),
      text,
      createdAt: now,
      updatedAt: now,
    };
    store.data.notes.push(note);
    await store.write();
    console.log(
      `${chalk.green('Jotted')} ${chalk.dim('·')} ${chalk.cyan(note.id)}`,
    );
  });

export { program };
