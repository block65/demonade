import { FSWatcher, watch } from 'chokidar';
import { logger } from './logger.js';
import { InternalConfig } from './config.js';

export async function startWatcher(config: InternalConfig): Promise<FSWatcher> {
  const include = Array.from(config.include);
  const exclude = config.exclude && Array.from(config.exclude);

  logger.debug('Watching [%s] from %s', include, config.workingDirectory);

  const watcher = watch(include, {
    cwd: config.workingDirectory,
    ignored: exclude,
    ignorePermissionErrors: true,
  });

  return new Promise<FSWatcher>((resolve, reject) => {
    watcher.on('ready', () => {
      const watched = watcher.getWatched();

      const dirs = Object.keys(watched);
      const files = Object.values(watched).flatMap((f) => f);

      logger.debug(
        'Watching %d files in %d directories',
        files.length,
        dirs.length,
      );
      resolve(watcher);
    });
    watcher.on('error', reject);
  });
}
