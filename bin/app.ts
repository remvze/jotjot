#!/usr/bin/env node

import chalk from 'chalk';

import { program } from '@/index';

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(message));
  process.exitCode = 1;
});
