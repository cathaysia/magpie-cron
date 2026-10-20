# Magie Cron

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Paseo Plugin](https://img.shields.io/badge/Paseo-Plugin-orange.svg)](https://paseo.sh)

> A Paseo plugin to periodically disable or enable models under specific AI providers using cron schedules.

---

## 🌟 Features

- ⏰ **Scheduled Model Disabling**: Automatically disable or enable specific models or entire providers based on cron schedules (e.g. rate limit windows, maintenance, peak-hour cost saving).
- 🛡️ **Lifecycle Protection**: Integrates with Paseo's `agent.create` hook (`server.before`) to immediately block agent creations targeting restricted models during blackouts.
- 🔄 **Auto-Revert**: Optional auto-reversion window (e.g. automatically re-enable after 60 minutes).
- 🖥️ **Integrated UI Screen**: Interactive management dashboard integrated into Paseo's sidebar and Command Center.
- ⚡ **Zero Downtime**: Seamlessly updates daemon configuration and hot-reloads without killing running tasks.

---

## 📦 Installation

Install directly into Paseo via CLI:

```bash
# From local directory
paseo plugin install /path/to/magie-cron

# Or from GitHub repository
paseo plugin install github:cathaysia/magie-cron
```

Verify that the plugin is running:

```bash
paseo plugin ls
```

---

## 🚀 Quick Start

1. Open Paseo app / web UI.
2. Click the **Clock** icon in the sidebar or open Command Center (**⌘K** / **Ctrl+K**) and run **"Open Magie Cron Schedule Manager"**.
3. Create a schedule rule:
   - **Provider**: `codex`
   - **Model ID**: `inclusionai/ling-3.0-flash-sante:free`
   - **Cron**: `0 0 * * *` (Daily at midnight)
   - **Duration**: `480` (Re-enable after 8 hours)
4. Save the rule. The daemon will monitor and execute the rule reliably.

---

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Typecheck TypeScript
pnpm run typecheck
```

---

## 📄 License

MIT © [cathaysia](https://github.com/cathaysia)
