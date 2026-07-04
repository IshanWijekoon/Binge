/** Secret workspace path segment — not linked from public UI. */
export const ADMIN_PATH_SEGMENT = "VhlJTY3bLK6pabC7Bsi-fg" as const;

export function adminBasePath(): `/${typeof ADMIN_PATH_SEGMENT}` {
  return `/${ADMIN_PATH_SEGMENT}`;
}

export function adminShowPath(id: string): `${ReturnType<typeof adminBasePath>}/show?id=${string}` {
  return `${adminBasePath()}/show?id=${encodeURIComponent(id)}`;
}
