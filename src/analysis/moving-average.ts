// Pure indicator functions: numbers in, numbers out, no I/O.
// Output arrays align with the input; positions without enough history are null.

export type Series = readonly number[];

/** Simple moving average over `period` points. */
export function sma(values: Series, period: number): (number | null)[] {
  assertPeriod(period);
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function assertPeriod(period: number): void {
  if (!Number.isInteger(period) || period < 1) {
    throw new RangeError(`period must be a positive integer, got ${period}`);
  }
}
