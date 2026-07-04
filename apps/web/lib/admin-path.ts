/** Secret workspace path segment — not linked from public UI. */
export const ADMIN_PATH_SEGMENT = "0A8!S$0y4KVTpG222P" as const;

export function adminBasePath(): `/${typeof ADMIN_PATH_SEGMENT}` {
  return `/${ADMIN_PATH_SEGMENT}`;
}

export function adminShowPath(id: string): `${ReturnType<typeof adminBasePath>}/show?id=${string}` {
  return `${adminBasePath()}/show?id=${encodeURIComponent(id)}`;
}
