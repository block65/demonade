import { CustomError, Status } from '@block65/custom-error';
import { lilconfig } from 'lilconfig';

export interface ResolvedConfig {
  command?: string;
  args?: string[];
  include: string[];
  exclude?: string[];
  signal?: NodeJS.Signals;
  logLevel?: 'info' | 'debug';
  delay?: number;
}

class ConfigError extends CustomError {
  public code = Status.INVALID_ARGUMENT;
}

export async function resolveConfig(
  cliArgs: Partial<ResolvedConfig>,
): Promise<ResolvedConfig> {
  const result = await lilconfig('demonade').search(); // Promise<LilconfigResult>

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
    command: result?.config?.command || cliArgs?.command,
    args: result?.config?.args || cliArgs?.args,
    signal: result?.config?.signal || cliArgs?.signal,
    include: ['.'],
  };

  return configCandidate;
}
