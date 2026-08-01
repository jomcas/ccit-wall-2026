interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export const CACHE_TTL = {
  POSTS: 2 * 60 * 1000,
  USERS: 5 * 60 * 1000,
  PROFILE: 3 * 60 * 1000,
} as const;

const PREFIX = 'ccit_cache_';

function readEntry<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

export const cache = {
  get<T>(key: string): T | null {
    const entry = readEntry<T>(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return entry.data;
  },

  set<T>(key: string, data: T, ttl: number): void {
    try {
      const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
      localStorage.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      // localStorage quota exceeded — skip silently
    }
  },

  invalidate(key: string): void {
    localStorage.removeItem(PREFIX + key);
  },

  invalidateByPrefix(prefix: string): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX + prefix)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  },
};

export function postsCacheKey(category?: string): string {
  return category ? `posts_${category}` : 'posts_all';
}
