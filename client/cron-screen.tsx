import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Pressable,
  Text,
  View,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";
import {
  getRulesRpc,
  saveRulesRpc,
  triggerRuleRpc,
  getProvidersRpc,
} from "../shared/rpc";
import { ScheduleRule } from "../shared/types";

export function CronScreen({ theme, layout }: PluginScreenProps) {
  const queryClient = useQueryClient();
  const getRules = useRpc(getRulesRpc);
  const saveRules = useRpc(saveRulesRpc);
  const triggerRule = useRpc(triggerRuleRpc);
  const getProviders = useRpc(getProvidersRpc);

  const { data: rulesData, isLoading: loadingRules } = useQuery({
    queryKey: ["magie_cron", "rules"],
    queryFn: () => getRules({}),
  });

  const { data: providersData } = useQuery({
    queryKey: ["magie_cron", "providers"],
    queryFn: () => getProviders({}),
  });

  const saveMutation = useMutation({
    mutationFn: (rules: ScheduleRule[]) => saveRules({ rules }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["magie_cron", "rules"] });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: (ruleId: string) => triggerRule({ ruleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["magie_cron", "rules"] });
      queryClient.invalidateQueries({ queryKey: ["magie_cron", "providers"] });
    },
  });

  const [editingRule, setEditingRule] = useState<Partial<ScheduleRule> | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
          padding: layout.compact ? 16 : 24,
          backgroundColor: theme.colors.surface0,
        },
        header: {
          marginBottom: 20,
        },
        title: {
          fontSize: 20,
          fontWeight: "bold",
          color: theme.colors.foreground,
        },
        subtitle: {
          fontSize: 14,
          color: theme.colors.foregroundMuted,
          marginTop: 4,
        },
        card: {
          backgroundColor: theme.colors.surface1,
          borderRadius: 8,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        cardHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        },
        ruleName: {
          fontSize: 16,
          fontWeight: "600",
          color: theme.colors.foreground,
        },
        ruleBadge: {
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 4,
          backgroundColor: theme.colors.surface2,
        },
        badgeText: {
          fontSize: 12,
          color: theme.colors.foregroundMuted,
        },
        ruleDetails: {
          fontSize: 13,
          color: theme.colors.foregroundMuted,
          marginBottom: 4,
        },
        buttonRow: {
          flexDirection: "row",
          gap: 8,
          marginTop: 12,
        },
        btn: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 6,
          alignItems: "center",
          justifyContent: "center",
        },
        primaryBtn: {
          backgroundColor: theme.colors.accent,
        },
        dangerBtn: {
          backgroundColor: "#ef4444",
        },
        secondaryBtn: {
          backgroundColor: theme.colors.surface2,
        },
        btnText: {
          color: theme.colors.accentForeground,
          fontWeight: "600",
          fontSize: 13,
        },
        secondaryBtnText: {
          color: theme.colors.foreground,
          fontSize: 13,
        },
        input: {
          backgroundColor: theme.colors.surface0,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: 6,
          padding: 10,
          color: theme.colors.foreground,
          marginBottom: 10,
        },
        label: {
          fontSize: 13,
          fontWeight: "500",
          color: theme.colors.foregroundMuted,
          marginBottom: 4,
        },
      }),
    [theme, layout.compact]
  );

  const rules = rulesData?.rules || [];

  const handleToggleRule = (rule: ScheduleRule) => {
    const updated = rules.map((r) =>
      r.id === rule.id ? { ...r, enabled: !r.enabled } : r
    );
    saveMutation.mutate(updated);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updated = rules.filter((r) => r.id !== ruleId);
    saveMutation.mutate(updated);
  };

  const [formError, setFormError] = useState<string | null>(null);

  const handleSaveRule = () => {
    if (!editingRule?.name || !editingRule?.provider || !editingRule?.cron) {
      setFormError("Please fill all required fields (Name, Provider, Cron)");
      return;
    }
    setFormError(null);

    const newRule: ScheduleRule = {
      id: editingRule.id || `rule_${Date.now()}`,
      name: editingRule.name,
      provider: editingRule.provider,
      modelId: editingRule.modelId || undefined,
      action: editingRule.action || "disable",
      cron: editingRule.cron,
      durationMinutes: editingRule.durationMinutes ? Number(editingRule.durationMinutes) : undefined,
      enabled: editingRule.enabled ?? true,
    };

    const exists = rules.some((r) => r.id === newRule.id);
    const updated = exists
      ? rules.map((r) => (r.id === newRule.id ? newRule : r))
      : [...rules, newRule];

    saveMutation.mutate(updated);
    setEditingRule(null);
  };

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Magie Cron (Model Schedule Manager)</Text>
        <Text style={styles.subtitle}>
          Schedule automatic disable/enable actions for models under specific providers
        </Text>
      </View>

      {/* Editor Modal / Section */}
      {editingRule ? (
        <View style={styles.card}>
          <Text style={[styles.ruleName, { marginBottom: 12 }]}>
            {editingRule.id ? "Edit Schedule Rule" : "Create Schedule Rule"}
          </Text>

          {formError ? (
            <Text style={{ color: "#ef4444", marginBottom: 10, fontSize: 13 }}>
              {formError}
            </Text>
          ) : null}

          <Text style={styles.label}>Rule Name</Text>
          <TextInput
            style={styles.input}
            value={editingRule.name || ""}
            onChangeText={(txt) => setEditingRule({ ...editingRule, name: txt })}
            placeholder="e.g. Nightly Disable Expensive Model"
            placeholderTextColor={theme.colors.foregroundMuted}
          />

          <Text style={styles.label}>Provider (e.g. codex, claude-code)</Text>
          <TextInput
            style={styles.input}
            value={editingRule.provider || ""}
            onChangeText={(txt) => setEditingRule({ ...editingRule, provider: txt })}
            placeholder="Provider ID"
            placeholderTextColor={theme.colors.foregroundMuted}
          />

          <Text style={styles.label}>Model ID (Optional, leave blank to disable entire provider)</Text>
          <TextInput
            style={styles.input}
            value={editingRule.modelId || ""}
            onChangeText={(txt) => setEditingRule({ ...editingRule, modelId: txt })}
            placeholder="e.g. inclusionai/ling-3.0-flash-sante:free"
            placeholderTextColor={theme.colors.foregroundMuted}
          />

          <Text style={styles.label}>Cron Expression (e.g. 0 22 * * * for 10 PM)</Text>
          <TextInput
            style={styles.input}
            value={editingRule.cron || ""}
            onChangeText={(txt) => setEditingRule({ ...editingRule, cron: txt })}
            placeholder="*/30 * * * *"
            placeholderTextColor={theme.colors.foregroundMuted}
          />

          <Text style={styles.label}>Auto Revert Duration (Minutes, Optional)</Text>
          <TextInput
            style={styles.input}
            value={editingRule.durationMinutes ? String(editingRule.durationMinutes) : ""}
            onChangeText={(txt) => setEditingRule({ ...editingRule, durationMinutes: Number(txt) || undefined })}
            placeholder="e.g. 480 (8 hours)"
            keyboardType="numeric"
            placeholderTextColor={theme.colors.foregroundMuted}
          />

          <View style={styles.buttonRow}>
            <Pressable style={[styles.btn, styles.primaryBtn]} onPress={handleSaveRule}>
              <Text style={styles.btnText}>Save Rule</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setEditingRule(null)}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ marginBottom: 16 }}>
          <Pressable
            style={[styles.btn, styles.primaryBtn, { alignSelf: "flex-start" }]}
            onPress={() =>
              setEditingRule({
                name: "",
                provider: "codex",
                cron: "0 22 * * *",
                action: "disable",
                enabled: true,
              })
            }
          >
            <Text style={styles.btnText}>+ Add Schedule Rule</Text>
          </Pressable>
        </View>
      )}

      {/* Rules List */}
      <Text style={[styles.ruleName, { marginBottom: 12 }]}>Configured Rules</Text>
      {loadingRules ? (
        <Text style={styles.ruleDetails}>Loading rules...</Text>
      ) : rules.length === 0 ? (
        <Text style={styles.ruleDetails}>No schedule rules configured yet.</Text>
      ) : (
        rules.map((rule) => (
          <View key={rule.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.ruleName}>{rule.name}</Text>
              <View style={styles.ruleBadge}>
                <Text style={styles.badgeText}>
                  {rule.enabled ? "Active" : "Disabled"}
                </Text>
              </View>
            </View>

            <Text style={styles.ruleDetails}>
              Provider: <Text style={{ color: theme.colors.foreground }}>{rule.provider}</Text>
            </Text>
            <Text style={styles.ruleDetails}>
              Target Model:{" "}
              <Text style={{ color: theme.colors.foreground }}>
                {rule.modelId || "(All models under provider)"}
              </Text>
            </Text>
            <Text style={styles.ruleDetails}>
              Action: <Text style={{ color: theme.colors.foreground }}>{rule.action.toUpperCase()}</Text>
            </Text>
            <Text style={styles.ruleDetails}>
              Cron: <Text style={{ color: theme.colors.foreground }}>{rule.cron}</Text>
            </Text>
            {rule.durationMinutes ? (
              <Text style={styles.ruleDetails}>
                Revert After: {rule.durationMinutes} minutes
              </Text>
            ) : null}
            {rule.lastTriggeredAt ? (
              <Text style={styles.ruleDetails}>
                Last Run: {new Date(rule.lastTriggeredAt).toLocaleString()}
              </Text>
            ) : null}

            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.btn, styles.secondaryBtn]}
                onPress={() => triggerMutation.mutate(rule.id)}
              >
                <Text style={styles.secondaryBtnText}>Run Now</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.secondaryBtn]}
                onPress={() => setEditingRule(rule)}
              >
                <Text style={styles.secondaryBtnText}>Edit</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.secondaryBtn]}
                onPress={() => handleToggleRule(rule)}
              >
                <Text style={styles.secondaryBtnText}>
                  {rule.enabled ? "Disable Rule" : "Enable Rule"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.dangerBtn]}
                onPress={() => handleDeleteRule(rule.id)}
              >
                <Text style={styles.btnText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      {/* Available Providers Info */}
      <View style={{ marginTop: 24, marginBottom: 40 }}>
        <Text style={[styles.ruleName, { marginBottom: 12 }]}>Current Detected Providers</Text>
        {providersData?.providers.map((p) => (
          <View key={p.id} style={[styles.card, { paddingVertical: 10 }]}>
            <Text style={styles.ruleName}>
              {p.label} ({p.id}) - {p.enabled ? "Enabled" : "Disabled"}
            </Text>
            {p.additionalModels.length > 0 && (
              <Text style={styles.ruleDetails}>
                Additional Models: {p.additionalModels.map((m) => m.id).join(", ")}
              </Text>
            )}
            {p.models.length > 0 && (
              <Text style={styles.ruleDetails}>
                Models: {p.models.map((m) => m.id).join(", ")}
              </Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
