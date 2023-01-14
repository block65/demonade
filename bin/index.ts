#!/usr/bin/env node
import { Level } from '@block65/logger';
import pDebounce from 'p-debounce';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { resolveConfig, InternalConfig } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { startProcess } from '../lib/process.js';
import { startWatcher } from '../lib/watcher.js';

async function start(config: InternalConfig) {
  if (config.verbose) {
    logger.setLevel(Level.Debug);
  } else if (config.quiet) {
    logger.setLevel(Level.Warn);
  }

  const watcher = await startWatcher(config);

  let result = await startProcess(config);

  const debouncedRestart = pDebounce(async () => {
    // this will trigger the process to exist
    result.controller?.abort();

    // wait for subprocess to die
    await new Promise<void>((resolve) => {
      if (result.subprocess.exitCode !== null) {
        // dead already?
        resolve();
      } else {
        // just resolve when dead
        result.subprocess.on('exit', resolve);
      }
    });

    result = await startProcess(config);
  }, config.delay);

  watcher.on('all', (eventName) => {
    if (['add', 'change', 'delete'].includes(eventName)) {
      debouncedRestart().catch(logger.warn);
    }
  });

  watcher.on('error', (err) => {
    logger.error(err);
    result.controller?.abort();
  });
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const cliArgs = yargs(hideBin(process.argv))
  .parserConfiguration({ 'unknown-options-as-args': true })
  .command('$0 [args...]', '', (y) => {
    y.option('command', {
      alias: 'c',
      type: 'string',
      description: 'Command to run',
    })
      .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Verbose logging (full debug output)',
      })
      .option('quiet', {
        alias: 'q',
        type: 'boolean',
        description: 'Quiet logging (warnings and errors only)',
      })
      .option('watch', {
        alias: 'w',
        type: 'string',
        description: 'Glob patterns to watch',
        coerce(arg: string[] | string): string[] {
          return Array.isArray(arg) ? arg : [arg];
        },
      })
      .option('ignore', {
        alias: 'i',
        type: 'string',
        description: 'Glob patterns to ignore',
        coerce(arg: string[] | string): string[] {
          return Array.isArray(arg) ? arg : [arg];
        },
      })
      .option('delay', {
        alias: 'd',
        type: 'number',
        description: 'Delay before starting process',
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

const config = await resolveConfig({
  args: cliArgs.args,
  command: cliArgs.command,
  signal: cliArgs.signal,
  watch: cliArgs.watch,
  ignore: cliArgs.ignore,
  verbose: cliArgs.verbose,
  quiet: cliArgs.quiet,
  delay: cliArgs.delay,
});

await start(config);
