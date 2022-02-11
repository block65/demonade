import { FSWatcher, watch } from 'chokidar';
import { logger } from '../bin/logger.js';
import { InternalConfig } from './config.js';

export async function startWatcher(config: InternalConfig): Promise<FSWatcher> {
  logger.info('Watching [%s] from %s', config.include, config.workingDirectory);

  const watcher = watch(Array.from(config.include), {
    cwd: config.workingDirectory,
    ignored: config.exclude && Array.from(config.exclude),
    ignorePermissionErrors: true,
  });

  return new Promise<FSWatcher>((resolve, reject) => {
    watcher.on('ready', () => {
      const watched = watcher.getWatched();

      const dirs = Object.keys(watched);
      const files = Object.values(watched).flatMap((f) => f);

      logger.info(
        'Watching %d files in %d directories',
        files.length,
        dirs.length,
      );
      resolve(watcher);
    });
    watcher.on('error', reject);
  });
}
