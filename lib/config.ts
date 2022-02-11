import { CustomError, Status } from '@block65/custom-error';
import { BaseLogger } from '@block65/logger';
import { findUp } from 'find-up';
import ignore from 'ignore';
import { lilconfig } from 'lilconfig';
import { dirname, relative } from 'node:path';
import { logger } from '../bin/logger.js';

/**
 * @private
 */
export interface InternalConfig {
  command: string;
  args: Set<string>;
  include: Set<string>;
  exclude?: Set<string>;
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

export async function resolveConfig(cliArgs: Config): Promise<InternalConfig> {
  const result = await lilconfig('demonade').search();

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

  const ig = ignore();

  // const gitIgnore = await findUp('.gitignore', {
  //   type: 'file',
  //   allowSymlinks: false,
  // });
  //
  // if (gitIgnore) {
  //   ig.add((await readFile(gitIgnore)).toString());
  // }

  ig.add(['.git', 'bazel-out']);

  const packageJson = await findUp('package.json', {
    type: 'file',
    allowSymlinks: false,
  });
  const packageDir = dirname(packageJson || process.cwd());

  const workingDirectory = result?.filepath
    ? dirname(result?.filepath)
    : packageDir;

  const include = new Set(
    [
      ...(result?.config?.include || cliArgs?.include || []),
      workingDirectory,
    ].map((p) => relative(p, workingDirectory)),
  );

  if (result?.config?.logLevel) {
    logger.level = result?.config?.logLevel;
  }

  if (cliArgs?.verbose) {
    logger.level = 'debug';
  }

  return {
    command: result?.config?.command || cliArgs?.command || 'node',
    args: result?.config?.args || cliArgs?.args || [],
    signal: result?.config?.signal || cliArgs?.signal || 'SIGUSR2',
    delay: result?.config?.delay || cliArgs?.delay || 200,
    include,
    workingDirectory,
    exclude: result?.config?.exclude ||
      cliArgs?.exclude || [
        (path: string) => {
          const rel = relative(workingDirectory, path);

          if (!rel) {
            return false;
          }

          try {
            return ig.ignores(rel);
          } catch (err) {
            logger.warn({ path, rel, err });
            return false;
          }
        },
      ],
  };
}
