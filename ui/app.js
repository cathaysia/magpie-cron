// Panel app script
let currentOptions = { rules: [] };
let editingRuleId = null;

const formEl = document.getElementById("rule-form");
const listEl = document.getElementById("rule-list");
const btnNew = document.getElementById("btn-new");
const btnCancel = document.getElementById("btn-cancel");
const btnSave = document.getElementById("btn-save");

const inputName = document.getElementById("rule-name");
const inputProvider = document.getElementById("rule-provider");
const inputModel = document.getElementById("rule-model");
const inputCron = document.getElementById("rule-cron");
const inputDuration = document.getElementById("rule-duration");

async function init() {
  if (window.magpie) {
    try {
      await window.magpie.ready;
      const opts = await window.magpie.options.get();
      if (opts && Array.isArray(opts.rules)) {
        currentOptions = opts;
      }
    } catch (e) {
      console.warn("Could not load options via magpie bridge:", e);
    }
  }

  renderRules();
}

function renderRules() {
  const rules = currentOptions.rules || [];
  if (rules.length === 0) {
    listEl.innerHTML = `<p style="font-size: 12px; color: var(--magpie-fg-muted, #777); margin: 0;">No schedule rules configured yet.</p>`;
    return;
  }

  listEl.innerHTML = "";
  rules.forEach((rule, idx) => {
    const item = document.createElement("div");
    item.className = "rule-item";

    const info = document.createElement("div");
    info.className = "rule-info";
    info.innerHTML = `
      <div class="rule-title">
        ${escapeHtml(rule.name || "Untitled Rule")}
        <span class="badge">${rule.enabled !== false ? "Active" : "Disabled"}</span>
      </div>
      <div class="rule-meta">
        Provider: <strong>${escapeHtml(rule.provider || "*")}</strong> | 
        Model: <strong>${escapeHtml(rule.modelId || "* (All)")}</strong> | 
        Cron: <code>${escapeHtml(rule.cron)}</code>
        ${rule.durationMinutes ? ` (${rule.durationMinutes}m window)` : ""}
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "actions";

    const btnToggle = document.createElement("button");
    btnToggle.className = "btn btn-secondary";
    btnToggle.textContent = rule.enabled !== false ? "Disable" : "Enable";
    btnToggle.onclick = () => toggleRule(idx);

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-secondary";
    btnEdit.textContent = "Edit";
    btnEdit.onclick = () => editRule(idx);

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn btn-danger";
    btnDelete.textContent = "Delete";
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
    editingRuleId = rule.id;
    inputName.value = rule.name || "";
    inputProvider.value = rule.provider || "";
    inputModel.value = rule.modelId || "";
    inputCron.value = rule.cron || "";
    inputDuration.value = rule.durationMinutes || "";
  } else {
    editingRuleId = null;
    inputName.value = "";
    inputProvider.value = "";
    inputModel.value = "";
    inputCron.value = "0 22 * * *";
    inputDuration.value = "480";
  }
}

function hideForm() {
  formEl.style.display = "none";
  btnNew.style.display = "inline-flex";
  editingRuleId = null;
}

async function saveRule() {
  const name = inputName.value.trim();
  const provider = inputProvider.value.trim();
  const modelId = inputModel.value.trim();
  const cron = inputCron.value.trim();
  const durationMinutes = parseInt(inputDuration.value.trim(), 10) || undefined;

  if (!provider || !cron) {
    alert("Provider and Cron expression are required.");
    return;
  }

  const rules = currentOptions.rules || [];
  if (editingRuleId) {
    const idx = rules.findIndex((r) => r.id === editingRuleId);
    if (idx !== -1) {
      rules[idx] = {
        ...rules[idx],
        name,
        provider,
        modelId,
        cron,
        durationMinutes,
        action: "disable",
      };
    }
  } else {
    rules.push({
      id: "rule_" + Date.now(),
      name: name || "Scheduled Disabling",
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
  const rules = currentOptions.rules || [];
  if (rules[idx]) {
    rules[idx].enabled = rules[idx].enabled === false ? true : false;
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
  const rules = currentOptions.rules || [];
  if (rules[idx]) {
    rules.splice(idx, 1);
    await persistOptions();
    renderRules();
  }
}

async function persistOptions() {
  if (window.magpie && window.magpie.options) {
    try {
      await window.magpie.options.set(currentOptions);
    } catch (e) {
      console.error("Failed to save options to magpie:", e);
    }
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

init();
