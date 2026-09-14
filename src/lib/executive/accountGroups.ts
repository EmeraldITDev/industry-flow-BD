// Strategic account group configuration.
// Groups map several raw client-name values (which are never modified) onto a
// single executive-facing account group. Editable in-app by authorised users;
// overrides are stored in localStorage under EXEC_ACCOUNT_GROUPS_KEY.

export interface AccountGroup {
  id: string;
  name: string;
  /** Case-insensitive substrings matched against the project's client name. */
  aliases: string[];
  /** Optional sub-entity labels used for the in-group breakdown. */
  entities?: string[];
}

export const EXEC_ACCOUNT_GROUPS_KEY = 'executiveAccountGroups';

export const DEFAULT_ACCOUNT_GROUPS: AccountGroup[] = [
  {
    id: 'dangote',
    name: 'Dangote Group',
    aliases: ['dangote', 'dprp', 'dfl', 'dcp'],
    entities: ['DPRP', 'DFL', 'DCP'],
  },
  { id: 'transafam', name: 'TransAfam', aliases: ['transafam', 'trans afam', 'afam'] },
  { id: 'chevron', name: 'Chevron', aliases: ['chevron', 'cnl'] },
  { id: 'nnpc', name: 'NNPC', aliases: ['nnpc', 'nuprc'] },
  { id: 'shell', name: 'Shell', aliases: ['shell', 'snepco', 'spdc'] },
];

export function loadAccountGroups(): AccountGroup[] {
  try {
    const raw = localStorage.getItem(EXEC_ACCOUNT_GROUPS_KEY);
    if (!raw) return DEFAULT_ACCOUNT_GROUPS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ACCOUNT_GROUPS;
    return parsed
      .filter((g: any) => g && typeof g.name === 'string')
      .map((g: any, i: number) => ({
        id: String(g.id ?? `group-${i}`),
        name: String(g.name),
        aliases: Array.isArray(g.aliases) ? g.aliases.filter(Boolean).map(String) : [],
        entities: Array.isArray(g.entities) ? g.entities.filter(Boolean).map(String) : undefined,
      }));
  } catch {
    return DEFAULT_ACCOUNT_GROUPS;
  }
}

export function saveAccountGroups(groups: AccountGroup[]): void {
  localStorage.setItem(EXEC_ACCOUNT_GROUPS_KEY, JSON.stringify(groups));
}

export function resetAccountGroups(): void {
  localStorage.removeItem(EXEC_ACCOUNT_GROUPS_KEY);
}

/** Returns the configured group whose aliases match this client name, if any. */
export function matchAccountGroup(
  clientName: string | undefined,
  groups: AccountGroup[]
): AccountGroup | null {
  if (!clientName) return null;
  const hay = clientName.toLowerCase();
  for (const group of groups) {
    if (group.name && hay.includes(group.name.toLowerCase())) return group;
    if (group.aliases.some((a) => a && hay.includes(a.toLowerCase()))) return group;
  }
  return null;
}
