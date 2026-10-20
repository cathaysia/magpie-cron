# Magie Cron

Magie Cron is a Paseo plugin designed to automate and schedule the disabling and enabling of models under specific AI providers using standard cron expressions.

## What It Does

In multi-agent environments with rate limits, quota resets, or budget constraints (e.g. daily/nightly quotas or free model windows), you might want to prevent agents from calling specific high-cost or rate-limited models during certain hours.

Magie Cron runs inside the Paseo daemon and provides:
- **Cron-based Automation**: Configure standard cron expressions (`0 22 * * *`, `*/30 * * * *`, etc.) to disable or enable models automatically.
- **Provider & Model Scoping**: Target a specific model (e.g., under `codex` or `claude-code`) or disable the entire provider.
- **Pre-emptive Agent Gating**: Hooks into Paseo's `agent.create` lifecycle hook (`server.before`) to immediately reject agent sessions initialized with disabled models or providers.
- **Automatic Reversion**: Optionally specify duration in minutes (e.g., disable for 480 minutes during off-peak hours) after which the model is automatically re-enabled.
- **Full UI & Control Center**: Dedicated settings & manager screen with real-time status of configured rules, one-click manual triggers ("Run Now"), and detected providers list.

## Usage

1. Open Paseo Command Center (**⌘K** or **Ctrl+K**) and search for **"Open Magie Cron Schedule Manager"**, or click the **Clock** icon in the sidebar.
2. Click **+ Add Schedule Rule**.
3. Fill in:
   - **Rule Name**: Desired label (e.g., "Nightly Disable Free Ling").
   - **Provider**: Provider identifier (e.g., `codex`, `claude-code`).
   - **Model ID**: (Optional) The specific model ID to disable. If left blank, the entire provider is disabled.
   - **Cron Expression**: Standard 5-field cron expression.
   - **Auto Revert Duration**: (Optional) Minutes after which the model should automatically re-enable.
4. Save and manage active rules.
