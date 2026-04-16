export type FalImageAttemptResult = {
  url: string | null;
  httpStatus: number;
  /** Short snippet for logs (no secrets). */
  detail: string;
};
