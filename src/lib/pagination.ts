export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Reads a list page's `page`/`pageSize` URL parameters, falling back to page 1 and the default
// size for anything missing or invalid. Shared by server pages and the pagination footer.
export function parsePageParams(params: { page?: string | null; pageSize?: string | null }): { page: number; pageSize: number } {
  const page = Number(params.page);
  const pageSize = Number(params.pageSize);
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 && pageSize <= MAX_PAGE_SIZE ? pageSize : DEFAULT_PAGE_SIZE,
  };
}
