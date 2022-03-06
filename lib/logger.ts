import { createLogger } from '@block65/logger';

export const logger = createLogger({
  traceCaller: false,
  prettyOptions: !!process.env.SHELL,
});
