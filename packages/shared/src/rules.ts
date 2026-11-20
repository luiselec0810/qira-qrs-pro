export type RuleType = "schedule" | "device" | "language";
export type DeviceOs = "iOS" | "Android" | "Desktop";

export interface ScheduleCondition {
  /** JS weekday numbers: 0 = Sunday ... 6 = Saturday. Empty/missing = every day. */
  days?: number[];
  /** "HH:mm" 24h, inclusive. */
  start: string;
  /** "HH:mm" 24h, exclusive. If end <= start the window crosses midnight. */
  end: string;
}

export interface DeviceCondition {
  os: DeviceOs[];
}

export interface LanguageCondition {
  /** ISO 639-1 primary subtags, e.g. ["es", "pt"]. */
  languages: string[];
}

export type RoutingRule =
  | { ruleType: "schedule"; conditionData: ScheduleCondition; targetUrl: string; priority: number }
  | { ruleType: "device"; conditionData: DeviceCondition; targetUrl: string; priority: number }
  | { ruleType: "language"; conditionData: LanguageCondition; targetUrl: string; priority: number };

export interface RequestContext {
  now: Date;
  userAgent: string | undefined;
  acceptLanguage: string | undefined;
}

export function detectOs(userAgent: string | undefined): DeviceOs {
  const ua = userAgent ?? "";
  // iPadOS 13+ reports as Macintosh; the "Mobile" token disambiguates real iPads in Safari.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  return "Desktop";
}

export function detectDeviceType(userAgent: string | undefined): "mobile" | "tablet" | "desktop" {
  const ua = userAgent ?? "";
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "mobile";
  return "desktop";
}

/** Parses Accept-Language into primary subtags ordered by q-value (desc). */
export function parseAcceptLanguage(header: string | undefined): string[] {
  if (!header) return [];
  const items = header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const quality = q ? Number.parseFloat(q.slice(2)) : 1;
      return { lang: tag.split("-")[0]!.toLowerCase(), quality: Number.isNaN(quality) ? 0 : quality, index };
    })
    .filter((i) => i.lang && i.lang !== "*" && i.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return [...new Set(items.map((i) => i.lang))];
}

/** Returns weekday (0-6) and minutes since midnight in the given IANA timezone. */
export function zonedClock(now: Date, timezone: string): { day: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const day = days.indexOf(parts.weekday ?? "Sun");
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return { day, minutes };
}

function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return Number.NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function matchesSchedule(cond: ScheduleCondition, now: Date, timezone: string): boolean {
  const { day, minutes } = zonedClock(now, timezone);
  const start = toMinutes(cond.start);
  const end = toMinutes(cond.end);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  const days = cond.days && cond.days.length > 0 ? cond.days : [0, 1, 2, 3, 4, 5, 6];

  if (start < end) return days.includes(day) && minutes >= start && minutes < end;
  // Overnight window (e.g. 22:00-02:00): the part after midnight belongs to the previous day.
  if (minutes >= start) return days.includes(day);
  if (minutes < end) return days.includes((day + 6) % 7);
  return false;
}

export function matchesRule(rule: RoutingRule, ctx: RequestContext, timezone: string): boolean {
  switch (rule.ruleType) {
    case "schedule":
      return matchesSchedule(rule.conditionData, ctx.now, timezone);
    case "device":
      return rule.conditionData.os.includes(detectOs(ctx.userAgent));
    case "language": {
      // Only the visitor's most preferred language decides, so "en-US,es;q=0.5" goes to English.
      const preferred = parseAcceptLanguage(ctx.acceptLanguage)[0];
      return !!preferred && rule.conditionData.languages.map((l) => l.toLowerCase()).includes(preferred);
    }
    default:
      return false;
  }
}

/** Evaluates rules by ascending priority; returns the first matching target or null (RF-02.3). */
export function evaluateRules(
  rules: readonly RoutingRule[],
  ctx: RequestContext,
  timezone: string,
): RoutingRule | null {
  const ordered = [...rules].sort((a, b) => a.priority - b.priority);
  return ordered.find((r) => matchesRule(r, ctx, timezone)) ?? null;
}
