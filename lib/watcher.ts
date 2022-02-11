import { BaseLogger } from '@block65/logger';
import { FSWatcher, watch } from 'chokidar';
import { findUp } from 'find-up';
import ignore from 'ignore';
import { readFile } from 'node:fs/promises';
import { dirname, relative } from 'node:path';

export async function startWatcher(
  include: string[],
  exclude?: (string | RegExp | ((path: string) => boolean))[],
  options?: { logger?: BaseLogger },
): Promise<FSWatcher> {
  const ig = ignore();

  const gitIgnore = await findUp('.gitignore', {
    type: 'file',
    allowSymlinks: false,
  });

  const packageJson = await findUp('package.json', {
    type: 'file',
    allowSymlinks: false,
  });

  if (gitIgnore) {
    ig.add((await readFile(gitIgnore)).toString());
  }

  const workingDirectory = packageJson ? dirname(packageJson) : process.cwd();

  const globs = [...include, workingDirectory];

  options?.logger?.info('Watching [%s] from %s', include, workingDirectory);

  const watcher = watch(globs, {
    cwd: workingDirectory,
    ignored: exclude || [
      (path) => {
        const rel = relative(workingDirectory, path);

        if (!rel) {
          return false;
        }

        try {
          return ig.ignores(rel);
        } catch (err) {
          options?.logger?.warn({ path, rel, err });
          return false;
        }
      },
    ],
    ignorePermissionErrors: true,
  });

  return new Promise<FSWatcher>((resolve, reject) => {
    watcher.on('ready', () => {
      const watched = watcher.getWatched();

      const dirs = Object.keys(watched);
      const files = Object.values(watched).flatMap((f) => f);

      options?.logger?.info(
        'Watching %d files in %d directories',
        files.length,
        dirs.length,
      );
      resolve(watcher);
    });
    watcher.on('error', reject);
  });
}
