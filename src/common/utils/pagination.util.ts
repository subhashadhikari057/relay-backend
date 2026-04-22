const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export function toSkipTake(
  page?: number,
  limit?: number,
  defaultPage = DEFAULT_PAGE,
  defaultLimit = DEFAULT_LIMIT,
) {
  const normalizedPage = page ?? defaultPage;
  const normalizedLimit = limit ?? defaultLimit;

  return {
    skip: (normalizedPage - 1) * normalizedLimit,
    take: normalizedLimit,
  };
}
