import { FSWatcher, watch } from 'chokidar';
import type { InternalConfig } from './config.js';
import { logger } from './logger.js';

export async function startWatcher(config: InternalConfig): Promise<FSWatcher> {
  const watches = config.watch.length === 0 ? ['.'] : config.watch;

  logger.info(
    { watches },
    'Starting %s watches from %s',
    watches.length,
    config.workingDirectory,
  );

  const watcher = watch(watches, {
    cwd: config.workingDirectory,
    ignorePermissionErrors: true,
    ignoreInitial: true, // we dont even resolve until ready fires
    ...(config.ignore && {
      ignored: config.ignore,
    }),
  });

  return new Promise<FSWatcher>((resolve, reject) => {
    watcher.on('ready', () => {
      const watched = watcher.getWatched();
      const paths = Object.values(watched).flat();

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
