// Public GitHub activity feed — no token needed (public events endpoint),
// so this only ever sees what's already visible on the user's public
// profile. Cached in sessionStorage for a few minutes to stay comfortably
// under GitHub's 60 req/hr unauthenticated rate limit.

const USERNAME_KEY = 'lifeos-github-username';
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface GitHubEvent {
  id: string;
  type: string;
  repo: string;
  createdAt: string;
  summary: string;
  url: string;
}

export function getGitHubUsername(): string {
  return localStorage.getItem(USERNAME_KEY) ?? '';
}

export function setGitHubUsername(username: string) {
  localStorage.setItem(USERNAME_KEY, username.trim());
}

function summarize(event: Record<string, unknown>): string {
  const type = event.type as string;
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  switch (type) {
    case 'PushEvent': {
      const commits = (payload.commits as unknown[] | undefined)?.length ?? 0;
      return `Pushed ${commits} commit${commits === 1 ? '' : 's'}`;
    }
    case 'PullRequestEvent':
      return `${payload.action ?? 'Updated'} a pull request`;
    case 'IssuesEvent':
      return `${payload.action ?? 'Updated'} an issue`;
    case 'CreateEvent':
      return `Created ${payload.ref_type ?? 'a ref'}${payload.ref ? ` "${payload.ref}"` : ''}`;
    case 'WatchEvent':
      return 'Starred the repo';
    case 'ForkEvent':
      return 'Forked the repo';
    case 'IssueCommentEvent':
      return 'Commented on an issue';
    default:
      return type.replace(/Event$/, '');
  }
}

export async function fetchGitHubActivity(username: string): Promise<GitHubEvent[]> {
  if (!username) return [];
  const cacheKey = `lifeos-github-cache:${username}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached) as { at: number; events: GitHubEvent[] };
    if (Date.now() - parsed.at < CACHE_TTL_MS) return parsed.events;
  }

  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=15`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
  const raw = (await res.json()) as Record<string, unknown>[];

  const events: GitHubEvent[] = raw.map((e) => ({
    id: e.id as string,
    type: e.type as string,
    repo: (e.repo as { name: string }).name,
    createdAt: e.created_at as string,
    summary: summarize(e),
    url: `https://github.com/${(e.repo as { name: string }).name}`,
  }));

  sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), events }));
  return events;
}
