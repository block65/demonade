import { CustomError } from '@block65/custom-error';
import { createCliLogger } from '@block65/logger';
import { SpawnOptionsWithoutStdio } from 'child_process';
import { lilconfig } from 'lilconfig';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { startProcess } from '../lib/process.js';
import { debounce } from '../lib/utils.js';
import { startWatcher } from '../lib/watcher.js';

interface ResolvedConfig {
  command: string;
  args?: string[];
  globs: string[];
  signal?: NodeJS.Signals;
}

export type Config = Partial<ResolvedConfig>;

const logger = createCliLogger({
  level: 'trace',
  traceCaller: false,
});

class ConfigError extends CustomError {}

async function resolveConfig(
  cliArgs: Partial<ResolvedConfig>,
): Promise<ResolvedConfig> {
  const result = await lilconfig('myapp').search(); // Promise<LilconfigResult>

  if (
    !cliArgs.command &&
    !cliArgs.args &&
    !result?.config.command &&
    !result?.config.args
  ) {
    throw new ConfigError('Must provide either a command or arguments').debug({
      config: result?.config,
      cliArgs,
    });
  }

  const configCandidate = {
    command: result?.config?.command || cliArgs?.command || 'node',
    args: result?.config?.args || cliArgs?.args,
    signal: result?.config?.signal || cliArgs?.signal,
    globs: ['*/*'],
  };

  return configCandidate;
}

async function start(config: ResolvedConfig) {
  logger.info('Starting...');
  logger.trace({ config }, 'resolved config');

  const killSignal = config.signal || 'SIGUSR2';
  const spawnOptions: SpawnOptionsWithoutStdio = {
    killSignal,
  };

  let [watcher, controller] = await Promise.all([
    startWatcher(config.globs),
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
    }, 250),
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
    }).positional('args', {
      type: 'string',
      array: true,
      description: 'Arguments to pass to command',
    });
  })
  .help().argv as any;

resolveConfig({
  args: cliArgs.args,
  command: cliArgs.command,
  // globs: argv.globs,
})
  .then((config) => start(config))
  .catch((err) => logger.error(err));
