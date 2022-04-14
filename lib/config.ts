import { CustomError, Status } from '@block65/custom-error';
import { findUp } from 'find-up';
import { lilconfig } from 'lilconfig';
import { dirname, relative } from 'node:path';
import { logger } from './logger.js';

/**
 * @private
 */
export interface InternalConfig {
  command: string;
  args: string[];
  watch: string[];
  ignore?: (string | RegExp | ((path: string) => boolean))[];
  workingDirectory: string;
  signal: NodeJS.Signals;
  delay: number;
  quiet?: boolean;
  verbose?: boolean;
}

export interface CliConfig {
  command?: string;
  args?: string[];
  signal?: NodeJS.Signals;
  watch?: string[];
  ignore?: string[];
  quiet?: boolean;
  verbose?: boolean;
  delay?: number;
}

export interface Config {
  command?: string;
  args?: string[];
  watch?: string[];
  ignore?: (string | RegExp | ((path: string) => boolean))[];
  signal?: NodeJS.Signals;
  quiet?: boolean;
  verbose?: boolean;
  delay?: number;
}

class ConfigError extends CustomError {
  public code = Status.INVALID_ARGUMENT;
}

function loadEsm(specifier: string) {
  return import(specifier);
}

export async function resolveConfig(
  cliConfig: CliConfig,
): Promise<InternalConfig> {
  const configResult = await lilconfig('demonade', {
    loaders: {
      '.js': loadEsm,
      '.mjs': loadEsm,
    },
  }).search();

  if (
    !cliConfig.command &&
    !cliConfig.args &&
    !configResult?.config.command &&
    !configResult?.config.args
  ) {
    throw new ConfigError('Provide either `command` or `args`').debug({
      config: configResult?.config,
      cliArgs: cliConfig,
    });
  }

  const packageJson = await findUp('package.json', {
    type: 'file',
    allowSymlinks: false,
  });
  const packageDir = dirname(packageJson || process.cwd());

  const workingDirectory = configResult?.filepath
    ? dirname(configResult?.filepath)
    : packageDir;

  const watch = [
    ...new Set<string>([
      ...(configResult?.config?.watch || []),
      ...(cliConfig?.watch || []),
      ...(!configResult?.config?.watch && cliConfig?.watch
        ? [workingDirectory]
        : []),
    ]),
  ]
    .map((p) => relative(workingDirectory, p))
    .filter(Boolean);

  const configIgnore: (string | RegExp | ((path: string) => boolean))[] = [
    ...new Set([
      ...(configResult?.config?.ignore || []),
      ...(cliConfig?.ignore || []),
    ]),
  ].filter(Boolean);

  const defaultIgnore = [/(^|[/\\])\../, '**/node_modules/**'];

  const ignore = configIgnore.length > 0 ? configIgnore : defaultIgnore;

  const resolved: InternalConfig = {
    workingDirectory,
    watch,
    ignore,
    command:
      cliConfig?.command || configResult?.config?.command || process.execPath,
    args: cliConfig?.args || configResult?.config?.args || [],
    signal: cliConfig?.signal || configResult?.config?.signal || 'SIGUSR2',
    delay: cliConfig?.delay || configResult?.config?.delay || 200,
    quiet: cliConfig?.quiet || configResult?.config?.quiet,
    verbose: cliConfig?.verbose || configResult?.config?.verbose,
  };

  logger.trace(
    {
      cliConfig,
      resolved,
    },
    'resolved config',
  );

  return resolved;
}
