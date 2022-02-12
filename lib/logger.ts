import { createCliLogger, createLogger } from '@block65/logger';

export const logger = process.env.SHELL
  ? createLogger()
  : createCliLogger({
      traceCaller: false,
    });
