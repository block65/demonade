#!/usr/bin/env node

import { createCliLogger } from '@block65/logger';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { resolveConfig, ResolvedConfig } from '../lib/config.js';
import { startProcess } from '../lib/process.js';
import { debounce } from '../lib/utils.js';
import { startWatcher } from '../lib/watcher.js';

const logger = createCliLogger({
  level: 'trace',
  traceCaller: false,
});

async function start(config: ResolvedConfig) {
  if (config.logLevel) {
    logger.level = config.logLevel;
  }

  logger.info('Starting...');
  logger.trace({ config }, 'resolved config');

  const killSignal = config.signal || 'SIGUSR2';
  const spawnOptions = {
    logger,
    killSignal,
  };

  let [watcher, controller] = await Promise.all([
    startWatcher(config.include, config.exclude, {
      logger,
    }),
    startProcess(config.command, config.args, spawnOptions),
  ]);

  watcher.on(
    'all',
    debounce(async (event, path) => {
      logger.debug('fs event {%s: %s}', event, path);
      controller?.abort();
      controller = await startProcess(
        config.command,
        config.args,
        spawnOptions,
      );
    }, 200),
  );

  watcher.on('error', (err) => {
    logger.error(err);
    controller?.abort();
  });
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
  logLevel: cliArgs.verbose ? 'debug' : 'info',
  // globs: argv.globs,
})
  .then((config) => start(config))
  .catch((err) => logger.error(err));
