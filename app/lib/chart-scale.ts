/** Count-friendly ticks, with a real zero baseline and support for net losses. */
export function chartScale(values: Array<number | null>) {
  const measured = values.filter((value): value is number => value !== null && Number.isFinite(value));
  const minimum = Math.min(0, ...measured);
  const maximum = Math.max(0, ...measured);
  const raw = Math.max(1, (maximum - minimum) / 4);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find(value => value * magnitude >= raw) ?? 10) * magnitude;
  const low = Math.floor(minimum / step) * step;
  const high = maximum === minimum ? low + 4 * step : Math.ceil(maximum / step) * step;
  const ticks = Array.from({ length: Math.round((high - low) / step) + 1 }, (_, index) => high - index * step);
  const position = (value: number) => (high - value) / (high - low) * 100;
  return { low, high, ticks, position, zero: position(0) };
}
