import { spawn, SpawnOptionsWithoutStdio } from 'node:child_process';
import { logger } from './logger.js';
import { InternalConfig } from './config.js';

export function startProcess(
  config: InternalConfig,
  options?: SpawnOptionsWithoutStdio,
): Promise<AbortController> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();

    logger.debug(
      config,
      'Spawning new process: %s [%s]',
      config.command,
      config.args,
    );

    const subprocess = spawn(config.command, config.args, {
      signal: controller.signal,
      killSignal: config.signal,
      ...options,
    });

    const childLogger = logger.child(
      {
        cmd: config.command,
        args: config.args,
        pid: subprocess.pid,
      },
      {
        context: { name: 'subprocess' },
      },
    );

    subprocess.stdout.pipe(process.stdout);
    subprocess.stderr.pipe(process.stderr);

    subprocess.on('close', (code, signal) => {
      childLogger.trace({ code, signal }, 'closed');
    });

    subprocess.on('spawn', () => {
      childLogger.trace('spawned');
      resolve(controller);
    });

    subprocess.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ABORT_ERR') {
        childLogger.trace('subprocess aborted');
        resolve(controller);
      } else {
        childLogger.error(err, 'subprocess errored');
        reject(err);
      }
    });

    controller.signal.addEventListener('abort', () => {
      subprocess.removeAllListeners();
    });
  });
}
