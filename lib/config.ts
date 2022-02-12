import { CustomError, Status } from '@block65/custom-error';
import { findUp } from 'find-up';
import { lilconfig } from 'lilconfig';
import minimatch from 'minimatch';
import { dirname, relative } from 'node:path';
import { logger } from './logger.js';

/**
 * @private
 */
export interface InternalConfig {
  command: string;
  args: Set<string>;
  include: Set<string>;
  exclude?: Set<string | RegExp | ((path: string) => boolean)>;
  workingDirectory: string;
  signal: NodeJS.Signals;
  delay: number;
}

export interface Config {
  command?: string;
  args?: string[];
  include?: string[];
  exclude?: string[];
  signal?: NodeJS.Signals;
  verbose?: boolean;
  delay?: number;
}

class ConfigError extends CustomError {
  public code = Status.INVALID_ARGUMENT;
}

function minimatchWithLogger(path: string, glob: string) {
  const matched = minimatch(path, glob);
  logger.trace('%s : %s = %s', path, glob, matched);
  return matched;
}

export async function resolveConfig(cliArgs: Config): Promise<InternalConfig> {
  const result = await lilconfig('demonade').search();

  if (result?.config?.logLevel) {
    logger.level = result?.config?.logLevel;
  }

  if (cliArgs?.verbose) {
    logger.level = 'debug';
  }

  if (
    !cliArgs.command &&
    !cliArgs.args &&
    !result?.config.command &&
    !result?.config.args
  ) {
    throw new ConfigError('Provide either `command` or `args`').debug({
      config: result?.config,
      cliArgs,
    });
  }

  const packageJson = await findUp('package.json', {
    type: 'file',
    allowSymlinks: false,
  });
  const packageDir = dirname(packageJson || process.cwd());

  const workingDirectory = result?.filepath
    ? dirname(result?.filepath)
    : packageDir;

  const include = [
    ...(result?.config?.include || cliArgs?.include || []),
    workingDirectory,
  ]
    .map((p) => relative(p, workingDirectory) || '.')
    .filter(Boolean);

  const exclude: string[] | undefined = (
    result?.config?.exclude || cliArgs?.exclude
  )?.filter(Boolean);

  const defaultExcludeGlobs = ['.*', 'node_modules'];

  const config: InternalConfig = {
    command: result?.config?.command || cliArgs?.command || process.execPath,
    args: result?.config?.args || cliArgs?.args || [],
    signal: result?.config?.signal || cliArgs?.signal || 'SIGUSR2',
    delay: result?.config?.delay || cliArgs?.delay || 200,
    include: new Set(include),
    workingDirectory,
    exclude: new Set([
      function defaultExclude(abs: string) {
        const path = relative(workingDirectory, abs);
        // if config says exclude it, exclude it
        if (exclude?.some((glob) => minimatchWithLogger(path, glob))) {
          return true;
        }
        // otherwise default
        return defaultExcludeGlobs.some((glob) =>
          minimatchWithLogger(path, glob),
        );
      },
    ]),
  };

  logger.trace(config, 'resolved config');

  return config;
}
