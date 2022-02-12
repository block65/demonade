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
  args: string[];
  include: string[];
  exclude?: (path: string) => boolean;
  workingDirectory: string;
  signal: NodeJS.Signals;
  delay: number;
}

export interface CliConfig {
  command?: string;
  args?: string[];
  signal?: NodeJS.Signals;
  include?: string[];
  exclude?: string[];
  verbose?: boolean;
  delay?: number;
}

export interface Config {
  command?: string;
  args?: string[];
  include?: string[];
  exclude?: (string | RegExp | ((path: string) => boolean))[];
  signal?: NodeJS.Signals;
  verbose?: boolean;
  delay?: number;
}

class ConfigError extends CustomError {
  public code = Status.INVALID_ARGUMENT;
}

function minimatchWithLogger(path: string, glob: string) {
  const matched = minimatch(path, glob);
  logger.silent('%s : %s = %s', path, glob, matched);
  return matched;
}

export async function resolveConfig(
  cliConfig: CliConfig,
): Promise<InternalConfig> {
  const result = await lilconfig('demonade').search();

  if (result?.config?.logLevel) {
    logger.level = result?.config?.logLevel;
  }

  if (cliConfig?.verbose) {
    logger.level = 'debug';
  }

  if (
    !cliConfig.command &&
    !cliConfig.args &&
    !result?.config.command &&
    !result?.config.args
  ) {
    throw new ConfigError('Provide either `command` or `args`').debug({
      config: result?.config,
      cliArgs: cliConfig,
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
    ...new Set<string>(
      result?.config?.include || cliConfig?.include || [workingDirectory],
    ),
  ]
    .map((p) => relative(workingDirectory, p) || '.')
    .filter(Boolean);

  const exclude: (string | RegExp | ((path: string) => boolean))[] = [
    ...(result?.config?.exclude || []),
    ...(cliConfig?.exclude || []),
  ].filter(Boolean);

  const defaultExcludeGlobs = ['.*', 'node_modules'];

  const resolved: InternalConfig = {
    command: result?.config?.command || cliConfig?.command || process.execPath,
    args: result?.config?.args || cliConfig?.args || [],
    signal: result?.config?.signal || cliConfig?.signal || 'SIGUSR2',
    delay: result?.config?.delay || cliConfig?.delay || 200,
    workingDirectory,
    include,
    exclude: (absPath: string) => {
      const path = relative(workingDirectory, absPath);
      // if config says include it, don't exclude it
      if (include?.some((glob) => minimatchWithLogger(path, glob))) {
        return false;
      }
      // if config says exclude it, exclude it
      if (
        exclude?.some((glob) => {
          if (glob instanceof RegExp) {
            return path.match(glob);
          }
          if (typeof glob === 'function') {
            return glob(path);
          }
          return minimatchWithLogger(path, glob);
        })
      ) {
        return true;
      }
      // otherwise default
      return defaultExcludeGlobs.some((glob) =>
        minimatchWithLogger(path, glob),
      );
    },
  };

  logger.trace(
    {
      cliConfig,
      resolved,
      include: [...resolved.include],
    },
    'resolved config',
  );

  return resolved;
}
