import { z } from "zod";

export const ScheduleRuleSchema = z.object({
  id: z.string(),
  name: z.string().default("Rule"),
  provider: z.string().min(1, "Provider name is required"),
  modelId: z.string().optional(), // if empty, applies to all models under provider or the provider itself
  action: z.enum(["disable", "enable"]).default("disable"),
  cron: z.string().min(1, "Cron expression is required"),
  durationMinutes: z.number().int().positive().optional(), // optional auto-revert after N minutes
  enabled: z.boolean().default(true),
  lastTriggeredAt: z.string().optional(),
});

export type ScheduleRule = z.infer<typeof ScheduleRuleSchema>;

export const PluginConfigSchema = z.object({
  rules: z.array(ScheduleRuleSchema).default([]),
});

export type PluginConfig = z.infer<typeof PluginConfigSchema>;

export const ProviderModelItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  disabled: z.boolean().optional(),
});

export const ProviderInfoSchema = z.object({
  id: z.string(),
  label: z.string(),
  enabled: z.boolean(),
  models: z.array(ProviderModelItemSchema),
  additionalModels: z.array(ProviderModelItemSchema),
});

export type ProviderInfo = z.infer<typeof ProviderInfoSchema>;
