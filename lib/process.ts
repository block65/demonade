import { BaseLogger } from '@block65/logger';
import { SpawnOptionsWithoutStdio, spawn } from 'node:child_process';

export function startProcess(
  command: string,
  args: string[] = [],
  options: SpawnOptionsWithoutStdio & { logger?: BaseLogger } = {},
): Promise<AbortController> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();

    const subprocess = spawn(command, args, {
      signal: controller.signal,
      ...options,
    });

    const childLogger = options.logger?.child({
      name: command,
      pid: subprocess.pid,
    });

    // subprocess.stdout.on("data", (data) => {
    //   childLogger.trace(`stdout: %s`, data);
    // });
    //
    // subprocess.stderr.on("data", (data) => {
    //   childLogger.trace(`stderr: %s`, data);
    // });

    subprocess.stdout.pipe(process.stdout);
    subprocess.stderr.pipe(process.stderr);

    subprocess.on('close', (code, signal) => {
      childLogger?.trace({ code, signal }, 'subprocess closed');
    });

    subprocess.on('spawn', () => {
      childLogger?.trace('subprocess spawned');
      resolve(controller);
    });

    subprocess.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'ABORT_ERR') {
        childLogger?.error(err, 'subprocess errored');
        reject(err);
      }
    });
  });
}
