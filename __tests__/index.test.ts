import { describe, expect, test } from '@jest/globals';
import { resolveConfig } from '../lib/config.js';

describe('configs', () => {
  test('Full fat', async () => {
    await expect(
      resolveConfig({
        args: ['-c', 'hello'],
        command: 'woot',
        exclude: ['node_modules'],
        include: ['dist/**/*.js'],
        delay: 12,
        signal: 'SIGABRT',
        verbose: true,
      }),
    ).resolves.toMatchSnapshot<any>({
      workingDirectory: expect.any(String),
    });
  });
});
