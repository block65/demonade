import { BaseLogger } from '@block65/logger';
import { FSWatcher, watch } from 'chokidar';

export function startWatcher(
  globs: string[],
  options: { logger?: BaseLogger } = {},
): Promise<FSWatcher> {
  return new Promise<FSWatcher>((resolve, reject) => {
    const watcher = watch(globs);

    watcher.on('ready', () => {
      const watched = watcher.getWatched();

      const dirs = Object.keys(watched);
      const files = Object.values(watched).flatMap((f) => f);

      options.logger?.info(
        'Watching %d files in %d directories',
        files.length,
        dirs.length,
      );
      resolve(watcher);
    });
    watcher.on('error', reject);
  });
}
