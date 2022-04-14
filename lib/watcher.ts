import { FSWatcher, watch } from 'chokidar';
import { logger } from './logger.js';
import { InternalConfig } from './config.js';

export async function startWatcher(config: InternalConfig): Promise<FSWatcher> {
  logger.info(
    config.watch,
    'Starting %s watches from %s',
    config.watch.length,
    config.workingDirectory,
  );

  const watcher = watch(config.watch, {
    cwd: config.workingDirectory,
    ignored: config.ignore,
    ignorePermissionErrors: true,
    ignoreInitial: true, // we dont even resolve until ready fires
  });

  return new Promise<FSWatcher>((resolve, reject) => {
    watcher.on('ready', () => {
      const watched = watcher.getWatched();

      const paths = Object.values(watched).flatMap((f) => f);

      logger.info('Watching %d paths', paths.length);

      resolve(watcher);
    });

    // watcher.on('raw', (event, path, details) =>
    //
    // );

    watcher.on('all', (eventName, path) => {
      if (['add', 'change', 'delete'].includes(eventName)) {
        logger.trace('watcher: %s for %s', eventName, path);
      }
    });

    watcher.on('error', reject);
  });
}
