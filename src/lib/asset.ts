export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const asset = (path: string): string =>
  `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
