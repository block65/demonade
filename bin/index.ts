#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { resolveConfig, InternalConfig } from '../lib/config.js';
import { startProcess } from '../lib/process.js';
import { debounce } from '../lib/utils.js';
import { startWatcher } from '../lib/watcher.js';
import { logger } from '../lib/logger.js';

async function start(config: InternalConfig) {
  let [watcher, controller] = await Promise.all([
    startWatcher(config),
    startProcess(config),
  ]);

  watcher.on(
    'all',
    debounce(async (event, path) => {
      logger.debug('fs event {%s: %s}', event, path);
      controller?.abort();
      controller = await startProcess(config);
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
      .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Verbose output',
      })
      .alias('command', 'exec')
      .option('signal', {
        alias: 's',
        type: 'string',
        description: 'Signal to send the process',
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
  verbose: cliArgs.verbose,
  // globs: argv.globs,
})
  .then((config) => start(config))
  .catch((err) => logger.error(err));
