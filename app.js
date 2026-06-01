'use strict';

// =============================================
// Storage
// =============================================
const STORAGE_KEY = 'dinner-memo-v1';

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { menus: {}, shopping: {} };
  } catch {
    return { menus: {}, shopping: {} };
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.data));
}

// =============================================
// State
// =============================================
const today = new Date();

const appState = {
  currentYear: today.getFullYear(),
  currentMonth: today.getMonth(),
  selectedDate: null,
  shoppingWeekKey: getWeekKey(today),
  data: loadData()
};

// =============================================
// Utility helpers
// =============================================
function formatDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function dayNames() { return ['日', '月', '火', '水', '木', '金', '土']; }

function formatDayLabel(dateKey) {
  const { year, month, day } = parseDateKey(dateKey);
  const d = new Date(year, month, day);
  return `${month + 1}月${day}日（${dayNames()[d.getDay()]}）`;
}

function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Monday of the week
  const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - dayIdx);
  return formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function weekLabel(weekKey) {
  const { year, month, day } = parseDateKey(weekKey);
  const end = new Date(year, month, day + 6);
  return `${month + 1}/${day}〜${end.getMonth() + 1}/${end.getDate()}`;
}

function shiftWeek(weekKey, delta) {
  const { year, month, day } = parseDateKey(weekKey);
  const d = new Date(year, month, day + delta * 7);
  return formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// =============================================
// Calendar
// =============================================
function renderCalendar() {
  const { currentYear: year, currentMonth: month } = appState;

  document.getElementById('calendar-title').textContent = `${year}年${month + 1}月`;

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  // Monday = 0 offset
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  for (let i = 0; i < offset; i++) {
    const el = document.createElement('div');
    el.className = 'calendar-cell empty';
    grid.appendChild(el);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day);
    const entry = appState.data.menus[dateKey];
    const dow = new Date(year, month, day).getDay();

    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    if (dateKey === todayKey) cell.classList.add('today');
    if (dateKey === appState.selectedDate) cell.classList.add('selected');
    if (dow === 6) cell.classList.add('saturday');
    if (dow === 0) cell.classList.add('sunday');

    const dayEl = document.createElement('span');
    dayEl.className = 'cell-day';
    dayEl.textContent = day;
    cell.appendChild(dayEl);

    if (entry?.dinner?.title) {
      const menuEl = document.createElement('span');
      menuEl.className = 'cell-menu';
      menuEl.textContent = entry.dinner.title;
      cell.appendChild(menuEl);
    }

    if (entry?.dinner?.relay) {
      const dot = document.createElement('span');
      dot.className = 'cell-relay-dot';
      dot.title = 'リレーあり';
      cell.appendChild(dot);
    }

    cell.addEventListener('click', () => selectDate(dateKey));
    grid.appendChild(cell);
  }
}

function selectDate(dateKey) {
  if (appState.selectedDate === dateKey) {
    appState.selectedDate = null;
    showDetailPlaceholder();
  } else {
    appState.selectedDate = dateKey;
    showDetailForm(dateKey);
  }
  renderCalendar();
}

function showDetailPlaceholder() {
  document.getElementById('day-detail-placeholder').style.display = '';
  document.getElementById('day-detail-form').style.display = 'none';
}

function showDetailForm(dateKey) {
  document.getElementById('day-detail-placeholder').style.display = 'none';
  const form = document.getElementById('day-detail-form');
  form.style.display = '';

  document.getElementById('day-detail-title').textContent = formatDayLabel(dateKey);

  const entry = appState.data.menus[dateKey]?.dinner || {};
  document.getElementById('dinner-title').value = entry.title || '';
  document.getElementById('dinner-recipe').value = entry.recipe || '';
  document.getElementById('dinner-relay').value = entry.relay || '';
  document.getElementById('dinner-notes').value = entry.notes || '';
}

function saveEntry() {
  const dateKey = appState.selectedDate;
  if (!dateKey) return;

  const title = document.getElementById('dinner-title').value.trim();
  const recipe = document.getElementById('dinner-recipe').value.trim();
  const relay = document.getElementById('dinner-relay').value.trim();
  const notes = document.getElementById('dinner-notes').value.trim();

  if (!appState.data.menus[dateKey]) {
    appState.data.menus[dateKey] = {};
  }
  appState.data.menus[dateKey].dinner = { title, recipe, relay, notes };

  saveData();
  renderCalendar();

  // Brief visual feedback on save button
  const btn = document.getElementById('btn-save-entry');
  const orig = btn.textContent;
  btn.textContent = '保存しました！';
  btn.disabled = true;
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1200);
}

function deleteEntry() {
  const dateKey = appState.selectedDate;
  if (!dateKey) return;

  if (appState.data.menus[dateKey]) {
    delete appState.data.menus[dateKey].dinner;
    if (Object.keys(appState.data.menus[dateKey]).length === 0) {
      delete appState.data.menus[dateKey];
    }
  }
  saveData();
  appState.selectedDate = null;
  showDetailPlaceholder();
  renderCalendar();
}

// =============================================
// Shopping List
// =============================================
function ensureWeek(weekKey) {
  if (!appState.data.shopping[weekKey]) {
    appState.data.shopping[weekKey] = { items: [] };
  }
}

function parseShoppingText(text) {
  return text
    .split('\n')
    .map(line => line
      // Remove leading bullet symbols and number prefixes
      .replace(/^[\s　]*[\*\-・•◆◇▶▷→⇒＊※◉●○►\d]+[\.\)）]?\s*/, '')
      .trim()
    )
    .filter(line => line.length > 0)
    .map(text => ({ id: generateId(), text, checked: false }));
}

function renderShoppingList() {
  const weekKey = appState.shoppingWeekKey;
  ensureWeek(weekKey);

  document.getElementById('shopping-week-label').textContent = weekLabel(weekKey);

  const items = appState.data.shopping[weekKey].items;
  const listEl = document.getElementById('shopping-list');
  listEl.innerHTML = '';

  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-shopping';
    empty.textContent = 'まだアイテムがありません';
    listEl.appendChild(empty);
    document.getElementById('shopping-stats').textContent = '';
    return;
  }

  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'shopping-item' + (item.checked ? ' checked' : '');
    li.dataset.id = item.id;

    const checkbox = document.createElement('div');
    checkbox.className = 'item-checkbox';
    checkbox.textContent = '✓';
    checkbox.title = item.checked ? 'チェックを外す' : 'チェック';
    checkbox.addEventListener('click', () => toggleItem(weekKey, item.id));

    const textEl = document.createElement('span');
    textEl.className = 'item-text';
    textEl.textContent = item.text;

    const del = document.createElement('button');
    del.className = 'item-delete';
    del.textContent = '✕';
    del.title = '削除';
    del.addEventListener('click', () => deleteItem(weekKey, item.id));

    li.appendChild(checkbox);
    li.appendChild(textEl);
    li.appendChild(del);
    listEl.appendChild(li);
  });

  const checked = items.filter(i => i.checked).length;
  document.getElementById('shopping-stats').textContent =
    `${checked} / ${items.length} 完了`;
}

function toggleItem(weekKey, itemId) {
  const item = appState.data.shopping[weekKey]?.items.find(i => i.id === itemId);
  if (item) { item.checked = !item.checked; }
  saveData();
  renderShoppingList();
}

function deleteItem(weekKey, itemId) {
  const list = appState.data.shopping[weekKey];
  if (list) {
    list.items = list.items.filter(i => i.id !== itemId);
    saveData();
    renderShoppingList();
  }
}

function listifyPaste() {
  const textarea = document.getElementById('paste-area');
  const text = textarea.value.trim();
  if (!text) return;

  const weekKey = appState.shoppingWeekKey;
  ensureWeek(weekKey);

  const newItems = parseShoppingText(text);
  appState.data.shopping[weekKey].items.push(...newItems);

  saveData();
  textarea.value = '';
  renderShoppingList();
}

function addItem() {
  const input = document.getElementById('new-item-input');
  const text = input.value.trim();
  if (!text) return;

  const weekKey = appState.shoppingWeekKey;
  ensureWeek(weekKey);
  appState.data.shopping[weekKey].items.push({ id: generateId(), text, checked: false });

  saveData();
  input.value = '';
  renderShoppingList();
}

function clearChecked() {
  const weekKey = appState.shoppingWeekKey;
  const list = appState.data.shopping[weekKey];
  if (!list) return;
  list.items = list.items.filter(i => !i.checked);
  saveData();
  renderShoppingList();
}

// =============================================
// Export
// =============================================
function buildMarkdown(fromMonth, toMonth, includeMenus, includeShopping) {
  const lines = [];
  lines.push('# 夕食献立メモ');
  lines.push('');

  // iterate months
  const [fy, fm] = fromMonth.split('-').map(Number);
  const [ty, tm] = toMonth.split('-').map(Number);

  for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); ) {
    if (includeMenus) {
      lines.push(`## ${y}年${m}月`);
      lines.push('');

      const daysInMonth = new Date(y, m, 0).getDate();
      let hasAny = false;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = formatDateKey(y, m - 1, day);
        const entry = appState.data.menus[dateKey]?.dinner;
        if (!entry || !entry.title) continue;

        hasAny = true;
        const label = formatDayLabel(dateKey);
        lines.push(`### ${label}`);
        if (entry.title) lines.push(`**夕食：** ${entry.title}`);
        lines.push('');
        if (entry.recipe) {
          lines.push('**レシピメモ**');
          lines.push(entry.recipe);
          lines.push('');
        }
        if (entry.relay) {
          lines.push(`**リレー情報：** ${entry.relay}`);
          lines.push('');
        }
        if (entry.notes) {
          lines.push(`**備考：** ${entry.notes}`);
          lines.push('');
        }
        lines.push('---');
        lines.push('');
      }

      if (!hasAny) {
        lines.push('（記録なし）');
        lines.push('');
      }
    }

    m++;
    if (m > 12) { m = 1; y++; }
  }

  if (includeShopping) {
    lines.push('## 買い物メモ');
    lines.push('');

    const keys = Object.keys(appState.data.shopping).sort();
    if (keys.length === 0) {
      lines.push('（記録なし）');
    } else {
      keys.forEach(weekKey => {
        const list = appState.data.shopping[weekKey];
        if (!list?.items?.length) return;
        lines.push(`### ${weekLabel(weekKey)}`);
        list.items.forEach(item => {
          lines.push(`- [${item.checked ? 'x' : ' '}] ${item.text}`);
        });
        lines.push('');
      });
    }
  }

  return lines.join('\n');
}

function showExportNotice(message, type = 'success') {
  const el = document.getElementById('export-notice');
  el.textContent = message;
  el.className = `export-notice ${type}`;
  el.style.display = '';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function openExportModal() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('export-from').value = ym;
  document.getElementById('export-to').value = ym;
  document.getElementById('export-modal').style.display = '';
}

function closeExportModal() {
  document.getElementById('export-modal').style.display = 'none';
}

function getExportParams() {
  const from = document.getElementById('export-from').value || (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  })();
  const to = document.getElementById('export-to').value || from;
  const includeMenus = document.getElementById('include-menus').checked;
  const includeShopping = document.getElementById('include-shopping').checked;
  return { from, to, includeMenus, includeShopping };
}

function copyMarkdown() {
  const { from, to, includeMenus, includeShopping } = getExportParams();
  const md = buildMarkdown(from, to, includeMenus, includeShopping);
  navigator.clipboard.writeText(md).then(() => {
    showExportNotice('クリップボードにコピーしました！Notionにペーストしてください。', 'success');
  }).catch(() => {
    // Fallback for environments without clipboard API
    const ta = document.createElement('textarea');
    ta.value = md;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showExportNotice('クリップボードにコピーしました！', 'success');
  });
}

function downloadJSON() {
  const { from, to } = getExportParams();
  const exportData = {
    exportedAt: new Date().toISOString(),
    range: { from, to },
    menus: appState.data.menus,
    shopping: appState.data.shopping
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dinner-memo-${from}-${to}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showExportNotice('JSONファイルをダウンロードしました。', 'success');
}

// =============================================
// Event wiring
// =============================================
function init() {
  // Calendar navigation
  document.getElementById('prev-month').addEventListener('click', () => {
    appState.currentMonth--;
    if (appState.currentMonth < 0) { appState.currentMonth = 11; appState.currentYear--; }
    renderCalendar();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    appState.currentMonth++;
    if (appState.currentMonth > 11) { appState.currentMonth = 0; appState.currentYear++; }
    renderCalendar();
  });

  // Detail panel
  document.getElementById('close-detail').addEventListener('click', () => {
    appState.selectedDate = null;
    showDetailPlaceholder();
    renderCalendar();
  });
  document.getElementById('btn-save-entry').addEventListener('click', saveEntry);
  document.getElementById('btn-delete-entry').addEventListener('click', deleteEntry);

  // Also save on Ctrl+Enter / Cmd+Enter in textareas
  document.querySelectorAll('.day-detail-form textarea, .day-detail-form input').forEach(el => {
    el.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') saveEntry();
    });
  });

  // Shopping week navigation
  document.getElementById('prev-week').addEventListener('click', () => {
    appState.shoppingWeekKey = shiftWeek(appState.shoppingWeekKey, -1);
    renderShoppingList();
  });
  document.getElementById('next-week').addEventListener('click', () => {
    appState.shoppingWeekKey = shiftWeek(appState.shoppingWeekKey, 1);
    renderShoppingList();
  });

  // Shopping actions
  document.getElementById('btn-listify').addEventListener('click', listifyPaste);
  document.getElementById('btn-add-item').addEventListener('click', addItem);
  document.getElementById('new-item-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addItem();
  });
  document.getElementById('btn-clear-checked').addEventListener('click', clearChecked);

  // Scroll to shopping section
  document.getElementById('btn-scroll-shopping').addEventListener('click', () => {
    document.getElementById('shopping-section').scrollIntoView({ behavior: 'smooth' });
  });

  // Export modal
  document.getElementById('btn-open-export').addEventListener('click', openExportModal);
  document.getElementById('close-export').addEventListener('click', closeExportModal);
  document.getElementById('export-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('export-modal')) closeExportModal();
  });
  document.getElementById('btn-copy-markdown').addEventListener('click', copyMarkdown);
  document.getElementById('btn-download-json').addEventListener('click', downloadJSON);

  // Initial renders
  renderCalendar();
  renderShoppingList();
}

document.addEventListener('DOMContentLoaded', init);
