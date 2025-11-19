export interface RobotsResult {
  allowed: boolean;
  reason?: string;
}

const robotsCache = new Map<string, { rules: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function checkRobotsTxt(url: string, userAgent = 'RadioCatalogBot'): Promise<RobotsResult> {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

    const cached = robotsCache.get(robotsUrl);
    let robotsText: string;

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      robotsText = cached.rules;
    } else {
      const response = await fetch(robotsUrl, {
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        return { allowed: true, reason: 'No robots.txt found (allowed by default)' };
      }

      robotsText = await response.text();
      robotsCache.set(robotsUrl, { rules: robotsText, timestamp: Date.now() });
    }

    const result = parseRobotsTxt(robotsText, userAgent, urlObj.pathname);
    return result;
  } catch (error) {
    return { allowed: true, reason: 'Error fetching robots.txt (allowed by default)' };
  }
}

function parseRobotsTxt(robotsText: string, userAgent: string, pathname: string): RobotsResult {
  const lines = robotsText.split('\n');
  let isRelevantSection = false;
  const disallowRules: string[] = [];
  const allowRules: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('#') || trimmed === '') {
      continue;
    }

    if (trimmed.toLowerCase().startsWith('user-agent:')) {
      const agent = trimmed.substring('user-agent:'.length).trim();
      isRelevantSection = agent === '*' || agent.toLowerCase() === userAgent.toLowerCase();
      continue;
    }

    if (isRelevantSection) {
      if (trimmed.toLowerCase().startsWith('disallow:')) {
        const path = trimmed.substring('disallow:'.length).trim();
        if (path) disallowRules.push(path);
      } else if (trimmed.toLowerCase().startsWith('allow:')) {
        const path = trimmed.substring('allow:'.length).trim();
        if (path) allowRules.push(path);
      }
    }
  }

  for (const allowRule of allowRules) {
    if (matchesRule(pathname, allowRule)) {
      return { allowed: true, reason: `Explicitly allowed by rule: ${allowRule}` };
    }
  }

  for (const disallowRule of disallowRules) {
    if (matchesRule(pathname, disallowRule)) {
      return { allowed: false, reason: `Disallowed by rule: ${disallowRule}` };
    }
  }

  return { allowed: true, reason: 'No matching disallow rules' };
}

function matchesRule(pathname: string, rule: string): boolean {
  if (rule === '/') {
    return true;
  }

  if (rule.endsWith('*')) {
    const prefix = rule.slice(0, -1);
    return pathname.startsWith(prefix);
  }

  if (rule.includes('*')) {
    const regexPattern = rule.replace(/\*/g, '.*').replace(/\?/g, '\\?');
    const regex = new RegExp(`^${regexPattern}`);
    return regex.test(pathname);
  }

  return pathname.startsWith(rule);
}

export function isRateLimited(domain: string, minDelayMs = 1000): boolean {
  const lastRequestKey = `last_request_${domain}`;
  const lastRequest = robotsCache.get(lastRequestKey);

  if (!lastRequest) {
    robotsCache.set(lastRequestKey, { rules: '', timestamp: Date.now() });
    return false;
  }

  const timeSinceLastRequest = Date.now() - lastRequest.timestamp;
  if (timeSinceLastRequest < minDelayMs) {
    return true;
  }

  robotsCache.set(lastRequestKey, { rules: '', timestamp: Date.now() });
  return false;
}
