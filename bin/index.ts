#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { resolveConfig, InternalConfig } from '../lib/config.js';
import { startProcess } from '../lib/process.js';
import { debounce } from '../lib/utils.js';
import { startWatcher } from '../lib/watcher.js';
import { logger } from '../lib/logger.js';

async function start(config: InternalConfig) {
  logger.trace(config);

  let [watcher, controller] = await Promise.all([
    startWatcher(config),
    startProcess(config),
  ]);

  watcher.on(
    'all',
    debounce(async (eventName) => {
      if (['add', 'change', 'unlink'].includes(eventName)) {
        controller?.abort();
        controller = await startProcess(config);
      }
    }, config.delay),
  );

  watcher.on(
    'error',
    debounce((err) => {
      logger.error(err);
      controller?.abort();
    }, config.delay),
  );
}

const cliArgs = yargs(hideBin(process.argv))
  .command('$0 [args...]', '', (y) => {
    y.option('command', {
      alias: 'c',
      type: 'string',
      description: 'Command to run',
    })
      .option('watch', {
        alias: 'w',
        type: 'string',
        description: 'Glob patterns to watch',
        coerce(arg: string[] | string): string[] {
          return Array.isArray(arg) ? arg : [arg];
        },
      })
      .alias('command', 'exec')
      .option('signal', {
        alias: 's',
        type: 'string',
        description: 'Signal to send the process',
        coerce(arg: string[] | string): string | undefined {
          return Array.isArray(arg) ? arg.at(-1) : arg;
        },
      })
      .positional('args', {
        type: 'string',
        array: true,
        description: 'Arguments to pass to command',
      });
  })
  .help().argv as any;

resolveConfig({
  args: cliArgs.args,
  command: cliArgs.command,
  signal: cliArgs.signal,
  watch: cliArgs.watch,
  // verbose: cliArgs.verbose,
  // globs: argv.globs,
})
  .then((config) => start(config))
  .catch((err) => logger.error(err));
