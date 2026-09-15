# JotJot

A minimal CLI for quickly jotting down notes.

## Install

Requires Node.js 20 or later and pnpm.

```sh
pnpm install
pnpm build
pnpm link --global
```

## Usage

Create a note:

```sh
jot "This is a test"
```

List notes, newest first:

```sh
jot list
jot ls
```

Fuzzy-search notes:

```sh
jot find "test"
jot f "test"
```

Edit a note:

```sh
jot edit <id>
jot edit <id> "Updated text"
```

Remove a note:

```sh
jot remove <id>
jot rm <id>
jot rm <id> --force
```

IDs can be shortened to any unique prefix. If a prefix matches multiple notes,
JotJot asks you to choose one.

## Storage

Notes are stored locally as JSON in `~/.jotjot/db.json`.
