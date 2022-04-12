import { describe, expect, test } from '@jest/globals';
import { resolveConfig } from '../lib/config.js';

describe('configs', () => {
  test('Full fat', async () => {
    await expect(
      resolveConfig({
        args: ['-c', 'hello'],
        command: 'woot',
        ignore: ['node_modules'],
        watch: ['dist/**/*.js'],
        delay: 12,
        signal: 'SIGABRT',
      }),
    ).resolves.toMatchSnapshot<any>({
      workingDirectory: expect.any(String),
    });
  });
});
