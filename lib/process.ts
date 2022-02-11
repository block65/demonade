import { spawn, SpawnOptionsWithoutStdio } from 'node:child_process';
import { logger } from '../bin/logger.js';
import { InternalConfig } from './config.js';

export function startProcess(
  config: InternalConfig,
  options?: SpawnOptionsWithoutStdio,
): Promise<AbortController> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();

    logger?.info('Spawning new process: %s %s', config.command, config.args);

    const subprocess = spawn(config.command, Array.from(config.args), {
      signal: controller.signal,
      killSignal: config.signal,
      ...options,
    });

    const childLogger = logger.child({
      name: config.command,
      pid: subprocess.pid,
    });

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
