"use client";

import * as React from "react";
import type {
  DeviceCondition,
  DeviceOs,
  LanguageCondition,
  RuleType,
  ScheduleCondition,
} from "@qira/shared";
import { ArrowDown, ArrowUp, Clock, Globe2, Plus, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface EditableRule {
  id: string;
  ruleType: RuleType;
  conditionData: ScheduleCondition | DeviceCondition | LanguageCondition;
  targetUrl: string;
  priority: number;
}

const WEEKDAYS: Array<{ day: number; short: string; label: string }> = [
  { day: 0, short: "Dom", label: "Domingo" },
  { day: 1, short: "Lun", label: "Lunes" },
  { day: 2, short: "Mar", label: "Martes" },
  { day: 3, short: "Mié", label: "Miércoles" },
  { day: 4, short: "Jue", label: "Jueves" },
  { day: 5, short: "Vie", label: "Viernes" },
  { day: 6, short: "Sáb", label: "Sábado" },
];

const OS_LIST: DeviceOs[] = ["iOS", "Android", "Desktop"];
const COMMON_LANGS = ["es", "en", "pt", "fr", "de", "it"];

function defaultConditionFor(type: RuleType): ScheduleCondition | DeviceCondition | LanguageCondition {
  switch (type) {
    case "schedule":
      return { days: [1, 2, 3, 4, 5], start: "08:00", end: "14:00" };
    case "device":
      return { os: ["iOS"] };
    case "language":
      return { languages: ["es"] };
  }
}

function renumber(rules: EditableRule[]): EditableRule[] {
  return rules.map((r, idx) => ({ ...r, priority: idx + 1 }));
}

export function RulesTab({
  rules,
  timezone,
  onChange,
}: {
  rules: EditableRule[];
  timezone: string;
  onChange: (next: EditableRule[]) => void;
}) {
  const [langDrafts, setLangDrafts] = React.useState<Record<string, string>>({});

  const addRule = (ruleType: RuleType = "schedule") => {
    const next: EditableRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ruleType,
      conditionData: defaultConditionFor(ruleType),
      targetUrl: "https://example.com",
      priority: rules.length + 1,
    };
    onChange(renumber([...rules, next]));
  };

  const updateRule = (index: number, patch: Partial<EditableRule>) => {
    const next = rules.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(renumber(next));
  };

  const removeRule = (index: number) => {
    onChange(renumber(rules.filter((_, i) => i !== index)));
  };

  const moveRule = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rules.length) return;
    const copy = [...rules];
    const [item] = copy.splice(index, 1);
    if (!item) return;
    copy.splice(target, 0, item);
    onChange(renumber(copy));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Reglas Inteligentes de Enrutamiento (RF-02.3)</CardTitle>
              <CardDescription>
                Las reglas se evalúan en estricto orden ascendente de prioridad (1 → N). La primera regla que coincida redirige al visitante; si ninguna coincide, se utiliza el destino predeterminado.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => addRule("schedule")}>
                <Clock className="size-4" />
                + Regla de Horario
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addRule("device")}>
                <Smartphone className="size-4" />
                + Regla de Dispositivo
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addRule("language")}>
                <Globe2 className="size-4" />
                + Regla de Idioma
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {rules.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="text-sm font-medium">No hay reglas inteligentes configuradas</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Añade una regla por horario (ej. menú de desayuno vs. cena), sistema operativo (App Store vs. Play Store) o idioma del navegador.
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => addRule("schedule")}>
                <Plus className="size-4" />
                Añadir Primera Regla
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule, idx) => {
                const sched = rule.ruleType === "schedule" ? (rule.conditionData as ScheduleCondition) : null;
                const dev = rule.ruleType === "device" ? (rule.conditionData as DeviceCondition) : null;
                const lang = rule.ruleType === "language" ? (rule.conditionData as LanguageCondition) : null;

                return (
                  <div key={rule.id} className="rounded-xl border bg-muted/20 p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge tone="default">Prioridad #{idx + 1}</Badge>
                        <NativeSelect
                          className="w-44"
                          value={rule.ruleType}
                          onChange={(e) => {
                            const nextType = e.target.value as RuleType;
                            updateRule(idx, {
                              ruleType: nextType,
                              conditionData: defaultConditionFor(nextType),
                            });
                          }}
                        >
                          <option value="schedule">Horario / Día y Hora</option>
                          <option value="device">Sistema Operativo</option>
                          <option value="language">Idioma del Navegador</option>
                        </NativeSelect>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Subir prioridad (mover arriba)"
                          disabled={idx === 0}
                          onClick={() => moveRule(idx, -1)}
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Bajar prioridad (mover abajo)"
                          disabled={idx === rules.length - 1}
                          onClick={() => moveRule(idx, 1)}
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          title="Eliminar regla"
                          onClick={() => removeRule(idx)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Schedule condition editor */}
                    {sched ? (
                      <div className="space-y-3 rounded-lg border bg-background p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Días Activos (evaluados en la zona horaria del QR: <code>{timezone}</code>)
                          </span>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() =>
                              updateRule(idx, {
                                conditionData: { ...sched, days: [0, 1, 2, 3, 4, 5, 6] },
                              })
                            }
                          >
                            Seleccionar todos los días
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {WEEKDAYS.map((w) => {
                            const currentDays = sched.days ?? [];
                            const active = currentDays.includes(w.day);
                            return (
                              <button
                                key={w.day}
                                type="button"
                                onClick={() => {
                                  const nextDays = active
                                    ? currentDays.filter((d) => d !== w.day)
                                    : [...currentDays, w.day].sort();
                                  updateRule(idx, {
                                    conditionData: { ...sched, days: nextDays },
                                  });
                                }}
                                className={cn(
                                  "rounded-md border px-2.5 py-1 text-xs font-medium transition",
                                  active
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "bg-muted/40 text-muted-foreground hover:bg-muted",
                                )}
                              >
                                {w.short}
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Hora de Inicio (24h HH:mm)">
                            <Input
                              type="time"
                              value={sched.start}
                              onChange={(e) =>
                                updateRule(idx, {
                                  conditionData: { ...sched, start: e.target.value },
                                })
                              }
                            />
                          </Field>
                          <Field label="Hora de Fin (24h HH:mm)" hint="Se admiten franjas nocturnas que cruzan medianoche (ej. 22:00 a 02:00).">
                            <Input
                              type="time"
                              value={sched.end}
                              onChange={(e) =>
                                updateRule(idx, {
                                  conditionData: { ...sched, end: e.target.value },
                                })
                              }
                            />
                          </Field>
                        </div>
                      </div>
                    ) : null}

                    {/* Device condition editor */}
                    {dev ? (
                      <div className="space-y-2 rounded-lg border bg-background p-3.5">
                        <div className="text-xs font-medium text-muted-foreground">
                          Sistemas Operativos del Visitante (según User-Agent)
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {OS_LIST.map((os) => {
                            const checked = dev.os.includes(os);
                            return (
                              <label
                                key={os}
                                className={cn(
                                  "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition",
                                  checked
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "hover:bg-muted",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    const nextOs = checked
                                      ? dev.os.filter((item) => item !== os)
                                      : [...dev.os, os];
                                    if (nextOs.length === 0) return;
                                    updateRule(idx, {
                                      conditionData: { os: nextOs },
                                    });
                                  }}
                                  className="accent-primary"
                                />
                                {os === "Desktop" ? "Escritorio (Desktop)" : os}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {/* Language condition editor */}
                    {lang ? (
                      <div className="space-y-3 rounded-lg border bg-background p-3.5">
                        <div className="text-xs font-medium text-muted-foreground">
                          Idioma Principal del Navegador del Visitante (códigos ISO 639-1 de Accept-Language)
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {COMMON_LANGS.map((code) => {
                            const active = lang.languages.includes(code);
                            return (
                              <button
                                key={code}
                                type="button"
                                onClick={() => {
                                  const nextLangs = active
                                    ? lang.languages.filter((l) => l !== code)
                                    : [...lang.languages, code];
                                  if (nextLangs.length === 0) return;
                                  updateRule(idx, {
                                    conditionData: { languages: nextLangs },
                                  });
                                }}
                                className={cn(
                                  "rounded-md border px-2.5 py-1 text-xs font-mono uppercase transition",
                                  active
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "bg-muted/40 text-muted-foreground hover:bg-muted",
                                )}
                              >
                                {code}
                              </button>
                            );
                          })}
                        </div>

                        <Field
                          label="Códigos de Idioma ISO (separados por comas)"
                          hint="Ejemplo: es, en, pt"
                        >
                          <Input
                            value={langDrafts[rule.id] ?? lang.languages.join(", ")}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setLangDrafts((prev) => ({ ...prev, [rule.id]: raw }));
                              const parsed = raw
                                .split(",")
                                .map((s) => s.trim().toLowerCase())
                                .filter((s) => /^[a-z]{2,3}$/.test(s));
                              if (parsed.length > 0) {
                                updateRule(idx, {
                                  conditionData: { languages: Array.from(new Set(parsed)) },
                                });
                              }
                            }}
                            onBlur={() => {
                              setLangDrafts((prev) => {
                                const next = { ...prev };
                                delete next[rule.id];
                                return next;
                              });
                            }}
                            placeholder="es, en, pt"
                          />
                        </Field>
                      </div>
                    ) : null}

                    <Field label="URL de Destino cuando la Regla Coincide *">
                      <Input
                        type="url"
                        placeholder="https://example.com/menu-almuerzo"
                        value={rule.targetUrl}
                        onChange={(e) => updateRule(idx, { targetUrl: e.target.value })}
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
