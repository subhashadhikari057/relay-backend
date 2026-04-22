const DURATION_REGEX = /^(\d+)([smhd])$/i;

const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

export function parseDurationToMilliseconds(
  duration: string,
  fallbackMs: number,
) {
  const matched = duration.match(DURATION_REGEX);
  if (!matched) {
    return fallbackMs;
  }

  const value = Number(matched[1]);
  const unit = matched[2].toLowerCase();
  return value * (UNIT_MS[unit] ?? fallbackMs);
}

export function parseDurationToSeconds(
  duration: string,
  fallbackSeconds: number,
) {
  const matched = duration.match(DURATION_REGEX);
  if (!matched) {
    return fallbackSeconds;
  }

  const value = Number(matched[1]);
  const unit = matched[2].toLowerCase();
  return value * (UNIT_SECONDS[unit] ?? fallbackSeconds);
}
