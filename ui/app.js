// Panel app script
let currentOptions = { rules: [] };
let editingRuleId = null;

const formEl = document.getElementById("rule-form");
const listEl = document.getElementById("rule-list");
const btnNew = document.getElementById("btn-new");
const btnCancel = document.getElementById("btn-cancel");
const btnSave = document.getElementById("btn-save");
const formTitleEl = document.getElementById("form-title");

const inputName = document.getElementById("rule-name");
const inputProvider = document.getElementById("rule-provider");
const inputModel = document.getElementById("rule-model");
const inputCron = document.getElementById("rule-cron");
const inputDuration = document.getElementById("rule-duration");

const btnToggleJson = document.getElementById("btn-toggle-json");
const jsonEditorCard = document.getElementById("json-editor-card");
const jsonTextarea = document.getElementById("json-textarea");
const btnSaveJson = document.getElementById("btn-save-json");

const LOCAL_STORAGE_KEY = "magpie_cron_options_fallback";

async function loadOptions() {
  // 1. 尝试从 window.magpie.options 读取
  if (window.magpie?.options?.get) {
    try {
      if (window.magpie.ready) {
        await Promise.race([
          window.magpie.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error("ready timeout")), 1500)),
        ]);
      }
      const opts = await window.magpie.options.get();
      if (opts && (Array.isArray(opts.rules) || opts.rules)) {
        return opts;
      }
    } catch (e) {
      console.warn("[magpie-cron] Could not load options via window.magpie.options:", e);
    }
  }

  // 2. 尝试从 parent / 顶层 window 探测 magpie 或上下文配置
  try {
    if (window.parent && window.parent !== window && window.parent.magpie?.options?.get) {
      const opts = await window.parent.magpie.options.get("magpie-cron");
      if (opts) return opts;
    }
  } catch {}

  // 3. 尝试读取可能由服务端注入或本地存储保存的配置
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.rules)) {
        return parsed;
      }
    }
  } catch {}

  return { rules: [] };
}

async function persistOptions() {
  // 1. 同步保存到 localStorage 作为持久化与保底
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentOptions));
  } catch (e) {
    console.warn("Failed to save to localStorage:", e);
  }

  // 2. 如果存在 magpie bridge，调用 set
  let saved = false;
  if (window.magpie?.options?.set) {
    try {
      await window.magpie.options.set(currentOptions);
      saved = true;
    } catch (e) {
      console.error("[magpie-cron] Failed to save options to magpie.options:", e);
    }
  }

  // 3. 尝试向 parent 广播保存事件 (适用于 iframe 嵌入环境)
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: "magpie-cron:update-options", payload: currentOptions },
        "*"
      );
    }
  } catch {}

  return saved;
}

async function init() {
  currentOptions = await loadOptions();
  renderRules();
}

function renderRules() {
  const rules = currentOptions.rules || [];
  if (rules.length === 0) {
    listEl.innerHTML = `<div class="empty-state">尚未配置任何定时规则，点击上方「+ 添加规则」创建。</div>`;
    return;
  }

  listEl.innerHTML = "";
  rules.forEach((rule, idx) => {
    const item = document.createElement("div");
    const isActive = rule.enabled !== false;
    item.className = `rule-item ${isActive ? "" : "disabled"}`;

    const info = document.createElement("div");
    info.className = "rule-main";
    info.innerHTML = `
      <div class="rule-header-row">
        <span class="rule-title">${escapeHtml(rule.name || "未命名规则")}</span>
        <span class="badge ${isActive ? "badge-active" : "badge-disabled"}">
          ${isActive ? "生效中" : "已停用"}
        </span>
      </div>
      <div class="rule-details">
        <span>Provider: <code class="rule-tag">${escapeHtml(rule.provider || "*")}</code></span>
        <span>Model: <code class="rule-tag">${escapeHtml(rule.modelId || "* (全部)")}</code></span>
        <span>Cron: <code class="rule-tag">${escapeHtml(rule.cron)}</code></span>
        ${rule.durationMinutes ? `<span>窗口: <code class="rule-tag">${rule.durationMinutes} 分钟</code></span>` : ""}
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "actions";

    const btnToggle = document.createElement("button");
    btnToggle.className = "btn btn-secondary btn-sm";
    btnToggle.textContent = isActive ? "停用" : "启用";
    btnToggle.onclick = () => toggleRule(idx);

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-secondary btn-sm";
    btnEdit.textContent = "编辑";
    btnEdit.onclick = () => editRule(idx);

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn btn-danger btn-sm";
    btnDelete.textContent = "删除";
    btnDelete.onclick = () => deleteRule(idx);

    actions.append(btnToggle, btnEdit, btnDelete);
    item.append(info, actions);
    listEl.append(item);
  });
}

function showForm(rule = null) {
  formEl.style.display = "block";
  btnNew.style.display = "none";
  if (rule) {
    formTitleEl.textContent = "编辑规则";
    editingRuleId = rule.id || ("rule_" + Date.now());
    inputName.value = rule.name || "";
    inputProvider.value = rule.provider || "*";
    inputModel.value = rule.modelId || "";
    inputCron.value = rule.cron || "";
    inputDuration.value = rule.durationMinutes !== undefined ? rule.durationMinutes : "";
  } else {
    formTitleEl.textContent = "添加规则";
    editingRuleId = null;
    inputName.value = "";
    inputProvider.value = "*";
    inputModel.value = "*deepseek*";
    inputCron.value = "0 9 * * 1-5";
    inputDuration.value = "180";
  }
  formEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideForm() {
  formEl.style.display = "none";
  btnNew.style.display = "inline-flex";
  editingRuleId = null;
}

async function saveRule() {
  const name = inputName.value.trim();
  const provider = inputProvider.value.trim() || "*";
  const modelId = inputModel.value.trim();
  const cron = inputCron.value.trim();
  const durationMinutes = parseInt(inputDuration.value.trim(), 10) || undefined;

  if (!cron) {
    alert("请输入合法的 Cron 表达式（例如 0 9 * * 1-5）");
    return;
  }

  const rules = [...(currentOptions.rules || [])];
  if (editingRuleId) {
    const idx = rules.findIndex((r) => r.id === editingRuleId);
    if (idx !== -1) {
      rules[idx] = {
        ...rules[idx],
        name: name || "定时限制规则",
        provider,
        modelId,
        cron,
        durationMinutes,
        action: "disable",
      };
    } else {
      rules.push({
        id: editingRuleId,
        name: name || "定时限制规则",
        provider,
        modelId,
        cron,
        durationMinutes,
        action: "disable",
        enabled: true,
      });
    }
  } else {
    rules.push({
      id: "rule_" + Date.now(),
      name: name || "定时限制规则",
      provider,
      modelId,
      cron,
      durationMinutes,
      action: "disable",
      enabled: true,
    });
  }

  currentOptions.rules = rules;
  await persistOptions();
  hideForm();
  renderRules();
}

async function toggleRule(idx) {
  const rules = [...(currentOptions.rules || [])];
  if (rules[idx]) {
    rules[idx].enabled = rules[idx].enabled === false ? true : false;
    currentOptions.rules = rules;
    await persistOptions();
    renderRules();
  }
}

async function editRule(idx) {
  const rules = currentOptions.rules || [];
  if (rules[idx]) {
    showForm(rules[idx]);
  }
}

async function deleteRule(idx) {
  if (!confirm("确定要删除这条规则吗？")) return;
  const rules = [...(currentOptions.rules || [])];
  if (rules[idx]) {
    rules.splice(idx, 1);
    currentOptions.rules = rules;
    await persistOptions();
    renderRules();
  }
}

function toggleJsonEditor() {
  if (jsonEditorCard.style.display === "block") {
    jsonEditorCard.style.display = "none";
  } else {
    jsonEditorCard.style.display = "block";
    jsonTextarea.value = JSON.stringify(currentOptions, null, 2);
  }
}

async function saveJson() {
  try {
    const parsed = JSON.parse(jsonTextarea.value.trim());
    if (parsed && Array.isArray(parsed.rules)) {
      currentOptions = parsed;
      await persistOptions();
      renderRules();
      jsonEditorCard.style.display = "none";
    } else {
      alert("JSON 格式错误：根对象中必须包含 rules 数组。");
    }
  } catch (err) {
    alert("JSON 解析失败: " + err.message);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

btnNew.onclick = () => showForm();
btnCancel.onclick = () => hideForm();
btnSave.onclick = () => saveRule();
btnToggleJson.onclick = () => toggleJsonEditor();
btnSaveJson.onclick = () => saveJson();

init();
