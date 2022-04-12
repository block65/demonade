import { FSWatcher, watch } from 'chokidar';
import { logger } from './logger.js';
import { InternalConfig } from './config.js';

export async function startWatcher(config: InternalConfig): Promise<FSWatcher> {
  const paths = config.watch;

  logger.info(
    { paths },
    'Watching %s paths from %s',
    paths.length,
    config.workingDirectory,
  );

  const watcher = watch(config.watch, {
    cwd: config.workingDirectory,
    ignored: config.ignore,
    ignorePermissionErrors: true,
  });

  return new Promise<FSWatcher>((resolve, reject) => {
    watcher.on('ready', () => {
      const watched = watcher.getWatched();

      const dirs = Object.keys(watched);
      const files = Object.values(watched).flatMap((f) => f);

      logger.info(
        'Watching %d files and %d directories',
        files.length,
        dirs.length,
      );

      logger.trace({ files, dirs }, 'watched'), resolve(watcher);
    });

    watcher.on('raw', (event, path, details) =>
      logger.trace({ details }, 'watcher: %s for %s', event, path),
    );

    watcher.on('error', reject);
  });
}
