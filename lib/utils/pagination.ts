export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function paginationResult(total: number, page: number, limit: number): PaginationResult {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export function sortClause(
  sortBy?: string,
  sortOrder?: "asc" | "desc"
): Record<string, 1 | -1> {
  const key = sortBy ?? "createdAt";
  const direction = sortOrder === "asc" ? 1 : -1;
  return { [key]: direction };
}
