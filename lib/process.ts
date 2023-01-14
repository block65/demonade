import {
  ChildProcessWithoutNullStreams,
  spawn,
  SpawnOptionsWithoutStdio,
} from 'node:child_process';
import type { InternalConfig } from './config.js';
import { logger } from './logger.js';

export function startProcess(
  config: InternalConfig,
  options?: SpawnOptionsWithoutStdio,
) {
  return new Promise<{
    controller: AbortController;
    subprocess: ChildProcessWithoutNullStreams;
  }>((resolve, reject) => {
    const controller = new AbortController();

    logger.debug('Spawning new process: %s [%s]', config.command, config.args);

    const subprocess = spawn(config.command, config.args, {
      signal: controller.signal,
      killSignal: config.signal,
      env: process.env,
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
      childLogger.trace({ code, signal });
      childLogger.debug('closed with exit code %d', code);
      if (code) {
        childLogger.warn(
          'Process crashed. Waiting for file change before restarting',
        );
      } else {
        childLogger.info('Waiting for file change before restarting');
      }
    });

    subprocess.on('spawn', () => {
      childLogger.trace('spawned');
      resolve({ controller, subprocess });
    });

    subprocess.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ABORT_ERR') {
        childLogger.trace('subprocess aborted');
        resolve({ controller, subprocess });
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
