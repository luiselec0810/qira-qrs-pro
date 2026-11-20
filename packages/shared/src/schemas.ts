import { z } from "zod";
import { sanitizeUrl } from "./url";

/** URL field that is sanitized (RNF-03) and normalized to its canonical form. */
export const safeUrl = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .transform((value, ctx) => {
    try {
      return sanitizeUrl(value);
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: (e as Error).message });
      return z.NEVER;
    }
  });

const hhmm = z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Expected HH:mm");

export const scheduleConditionSchema = z.object({
  days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  start: hhmm,
  end: hhmm,
});
export const deviceConditionSchema = z.object({
  os: z.array(z.enum(["iOS", "Android", "Desktop"])).min(1),
});
export const languageConditionSchema = z.object({
  languages: z.array(z.string().trim().toLowerCase().regex(/^[a-z]{2,3}$/)).min(1),
});

export const routingRuleInputSchema = z.discriminatedUnion("ruleType", [
  z.object({ ruleType: z.literal("schedule"), conditionData: scheduleConditionSchema, targetUrl: safeUrl, priority: z.number().int().min(0).default(1) }),
  z.object({ ruleType: z.literal("device"), conditionData: deviceConditionSchema, targetUrl: safeUrl, priority: z.number().int().min(0).default(1) }),
  z.object({ ruleType: z.literal("language"), conditionData: languageConditionSchema, targetUrl: safeUrl, priority: z.number().int().min(0).default(1) }),
]);
export type RoutingRuleInput = z.infer<typeof routingRuleInputSchema>;

export const utmSchema = z
  .object({
    utm_source: z.string().trim().max(200).optional(),
    utm_medium: z.string().trim().max(200).optional(),
    utm_campaign: z.string().trim().max(200).optional(),
  })
  .default({});

const optionalText = z.string().trim().max(500).optional();

export const vcardSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: optionalText,
  title: optionalText,
  company: optionalText,
  phone: optionalText,
  whatsapp: optionalText,
  email: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
  website: safeUrl.optional(),
  address: optionalText,
  photoUrl: safeUrl.optional(),
  note: z.string().trim().max(1000).optional(),
});

export const hubButtonSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().trim().min(1).max(80),
  url: z.string().trim().min(1).max(2048).refine((v) => {
    // tel: and mailto: are legitimate on a link hub; javascript:/data: are not.
    if (/^(tel|mailto):/i.test(v)) return true;
    try {
      sanitizeUrl(v);
      return true;
    } catch {
      return false;
    }
  }, "Unsafe or invalid URL"),
  icon: z.enum(["link", "whatsapp", "instagram", "facebook", "tiktok", "youtube", "x", "linkedin", "email", "phone", "map", "menu", "shop", "calendar"]),
});

export const hubSchema = z.object({
  logoUrl: safeUrl.optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  theme: z.object({ background: z.string(), foreground: z.string(), accent: z.string() }).optional(),
  buttons: z.array(hubButtonSchema).max(30),
});

export const landingDataSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("vcard"), vcard: vcardSchema }),
  z.object({ kind: z.literal("hub"), hub: hubSchema }),
]);

/** styleConfig is validated loosely: qr-code-styling owns the shape; normalizeQrStyle enforces invariants. */
export const styleConfigSchema = z.record(z.string(), z.unknown());

const qrBaseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  destinationType: z.enum(["url", "vcard", "hub"]).default("url"),
  defaultUrl: safeUrl.nullable().optional(),
  landingData: landingDataSchema.nullable().optional(),
  fallbackUrl: safeUrl.nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  /** Plain PIN in input only; stored hashed. `null` removes protection. */
  pinCode: z.string().regex(/^\d{4,8}$/, "PIN must be 4-8 digits").nullable().optional(),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA timezone").default("America/Bogota"),
  utmParams: utmSchema,
  webhookUrl: safeUrl.nullable().optional(),
  styleConfig: styleConfigSchema.optional(),
  status: z.enum(["active", "paused"]).default("active"),
  rules: z.array(routingRuleInputSchema).max(50).optional(),
});

function destinationRefinement(v: { destinationType?: string; defaultUrl?: string | null; landingData?: unknown }, ctx: z.RefinementCtx) {
  if (v.destinationType === "url" && v.defaultUrl === undefined) return;
  if (v.destinationType === "url" && !v.defaultUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["defaultUrl"], message: "defaultUrl is required for url destinations" });
  }
  if ((v.destinationType === "vcard" || v.destinationType === "hub") && v.landingData === undefined) return;
  if (v.destinationType === "vcard" || v.destinationType === "hub") {
    const kind = (v.landingData as { kind?: string } | null)?.kind;
    if (kind !== v.destinationType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["landingData"], message: `landingData.kind must be "${v.destinationType}"` });
    }
  }
}

export const createQrSchema = qrBaseSchema.superRefine((v, ctx) => {
  if (v.destinationType === "url" && !v.defaultUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["defaultUrl"], message: "defaultUrl is required for url destinations" });
  }
  destinationRefinement(v, ctx);
});
export type CreateQrInput = z.infer<typeof createQrSchema>;

/** PATCH: every field optional; `rules`, when present, replaces the full rule set. */
export const updateQrSchema = qrBaseSchema
  .partial()
  .extend({ utmParams: utmSchema.optional() })
  .superRefine(destinationRefinement);
export type UpdateQrInput = z.infer<typeof updateQrSchema>;

export const cardDesignSchema = z.object({
  name: z.string().trim().min(1).max(120),
  qrId: z.string().uuid().nullable().optional(),
  widthCm: z.number().positive().max(200),
  heightCm: z.number().positive().max(200),
  bleedMm: z.number().min(0).max(20).default(3),
  isDoubleSided: z.boolean().default(false),
  frontCanvasJson: z.unknown(),
  backCanvasJson: z.unknown().nullable().optional(),
  thumbnailUrl: z.string().max(2048).nullable().optional(),
});
export type CardDesignInput = z.infer<typeof cardDesignSchema>;

/**
 * RF-04.2: batch creation. `defaultUrlTemplate` may contain {{variables}}; each row's
 * substituted URL is sanitized individually on the server.
 */
export const createBatchSchema = z.object({
  namePrefix: z.string().trim().min(1).max(80),
  defaultUrlTemplate: z.string().trim().min(1).max(2048),
  rows: z.array(z.record(z.string(), z.string())).min(1).max(2000),
  styleConfig: styleConfigSchema.optional(),
  timezone: z.string().default("America/Bogota"),
  utmParams: utmSchema,
  webhookUrl: safeUrl.nullable().optional(),
  cardId: z.string().uuid().optional(),
});
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
