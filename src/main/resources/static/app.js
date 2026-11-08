const { t } = window.workbenchI18n;
const locale = () => window.workbenchI18n.language;
function message(selector, key, params = {}) { const el = document.querySelector(selector); el.dataset.message = key; delete el.dataset.retry; el.textContent = t(key, params); }
const $ = (selector) => document.querySelector(selector);
let labelDefinitions = [], taskLabelSelection = new Set(), editingLabelId = null, labelBusy = false;
let tasks = [], view = 'all', editing = null, busy = false, selectedLabel = '';
let selectedCalendarWeek = null;
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
const labels = { all: 'All tasks', calendar: 'Calendar', today: 'Today', week: 'This week', month: 'This month', upcoming: 'Upcoming', completed: 'Completed' };
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function dateLabel(value) { return new Date(`${value}T12:00:00`).toLocaleDateString(locale(),{month:'short',day:'numeric',year:'numeric'}); }
async function api(path = '', options = {}, resource = '/api/tasks') {
  let response;
  try { response = await fetch(`${resource}${path}`, { ...options, headers: { 'Content-Type': 'application/json' } }); }
  catch { throw new Error('Cannot reach the server. Check the connection and try again.'); }
  if (!response.ok && resource === '/api/labels') throw new Error(response.status === 409 ? 'A label with this name already exists.' : response.status === 400 ? 'Use a name of 1–40 characters and a color like #39a765.' : 'Could not save your change. Please try again.');
  if (!response.ok) throw new Error(response.status === 400 ? 'Check the task details and try again.' : response.status === 404 ? 'This task no longer exists. Refresh the page.' : 'Could not save your change. Please try again.');
  return response.status === 204 ? null : response.json();
}
function node(tag, className, text) { const el = document.createElement(tag); if(className) el.className = className; if(text !== undefined) el.textContent = text; return el; }
function payload(task) { return { title: task.title, notes: task.notes, dueDate: task.dueDate, priority: task.priority, completed: task.completed, labels: task.labels || [], taskType: task.taskType || 'DAILY' }; }
function allLabels() { return [...new Set([...labelDefinitions.map(label => label.name), ...tasks.flatMap(t => t.labels || [])])].sort(); }
function decorateLabel(chip, name) {
  const definition = labelDefinitions.find(label => label.name === name);
  const palette = labelPalette(definition?.color || '#9860cc');
  chip.classList.add('custom-label');
  for (const [key, value] of Object.entries({ink: palette.ink, bg: palette.background, border: palette.border, selected: palette.color, 'selected-text': palette.selectedText})) chip.style.setProperty(`--label-${key}`, value);
  return chip;
}
function filterLabel(label) { selectedLabel = label; render(); }
function render() {
  const isCalendar = view === 'calendar';
  document.querySelector('main').classList.toggle('calendar-mode', isCalendar);
  for (const selector of ['.heading', '.stats', '.toolbar', '#label-filters']) $(selector).hidden = isCalendar;
  const availableLabels = allLabels();
  const filters = ['', ...availableLabels];
  if(selectedLabel && !availableLabels.includes(selectedLabel)) filters.push(selectedLabel);
  $('#label-filters').replaceChildren(...filters.map(label => {
    const button = node('button', `label-chip${selectedLabel === label ? ' selected' : ''}`, label ? `# ${label}` : t('All labels'));
    if (label) decorateLabel(button, label);
    button.type = 'button'; button.setAttribute('aria-pressed', String(selectedLabel === label));
    button.addEventListener('click', () => filterLabel(label)); return button;
  }));
  const day = today(), open = tasks.filter(t => !t.completed), done = tasks.length - open.length;
  $('#all-count').textContent = tasks.length;
  $('#open-count').textContent = open.length;
  $('#today-count').textContent = open.filter(t => t.dueDate === day).length;
  $('#done-count').textContent = done;
  const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  $('#progress').value = percent; $('#progress-label').textContent = `${percent}%`;
  $('#view-title').replaceChildren(document.createTextNode(t(labels[view])), node('span', '', '.'));
  const reference = new Date(), period = taskPeriod(view, reference);
  $('.subtitle').textContent = period
    ? `${dateLabel(period.start)} – ${dateLabel(period.end)} · ${t(view === 'week' ? 'Unfinished tasks due this week (Mon–Sun).' : 'Unfinished tasks due this month.')}`
    : t('A clear mind starts with a clear list.');
  const query = isCalendar ? '' : $('#search').value.trim().toLowerCase();
  const filtered = tasks.filter(t => (isCalendar || !selectedLabel || (t.labels || []).includes(selectedLabel)) && matchesTaskView(t, view, reference) && `${t.title} ${t.notes} ${(t.labels || []).join(' ')}`.toLowerCase().includes(query));
  const ranks = {HIGH:0,MEDIUM:1,LOW:2};
  filtered.sort((a,b) => {
    if(view !== 'completed' && a.completed !== b.completed) return Number(a.completed)-Number(b.completed);
    const sort = $('#sort').value;
    return (sort === 'due' ? (a.dueDate || '9999').localeCompare(b.dueDate || '9999') : sort === 'priority' ? ranks[a.priority]-ranks[b.priority] : 0) || b.id-a.id;
  });
  $('#calendar').hidden = !isCalendar;
  $('#task-list').hidden = isCalendar;
  $('#list-footer').hidden = isCalendar;
  if(isCalendar) {
    $('#empty').hidden = true;
    renderCalendar(filtered);
    return;
  }
  $('#task-list').replaceChildren(...filtered.map(task => {
    const row = node('article', `task${task.completed ? ' completed' : ''}`);
    const check = node('input'); check.type = 'checkbox'; check.checked = task.completed; check.disabled = busy; check.setAttribute('aria-label',t(task.completed ? 'Mark {title} incomplete' : 'Mark {title} complete', {title: task.title}));
    check.addEventListener('change', () => mutate(async () => { const updated = await api(`/${task.id}`, {method:'PUT',body:JSON.stringify({...payload(task),completed:check.checked})}); tasks = tasks.map(t => t.id === updated.id ? updated : t); }));
    const body = node('div','task-body'), title = node('button','task-title',task.title); title.disabled = busy; title.addEventListener('click',() => openEditor(task)); body.append(title);
    if(task.notes) body.append(node('p','task-notes',task.notes));
    const meta = node('div','task-meta'); meta.append(node('span', 'badge', t(task.taskType === 'WEEKLY' ? 'Week tasks' : task.taskType === 'MONTHLY' ? 'Month tasks' : 'Daily tasks'))); meta.append(node('span',`badge ${task.priority.toLowerCase()}`,t(`${task.priority[0]}${task.priority.slice(1).toLowerCase()} priority`)));
    if(task.dueDate) meta.append(node('span',!task.completed && task.dueDate < day ? 'overdue' : '',`${!task.completed && task.dueDate < day ? t('Overdue · ') : ''}${dateLabel(task.dueDate)}`));
    for(const label of task.labels || []) {
      const chip = node('button','label-chip',`# ${label}`); chip.type = 'button'; decorateLabel(chip, label);
      chip.setAttribute('aria-label', t('Filter by label {label}', {label}));
      chip.addEventListener('click', () => filterLabel(label)); meta.append(chip);
    }
    body.append(meta);
    const remove = node('button','delete','×'); remove.disabled = busy; remove.setAttribute('aria-label',t('Delete {title}', {title: task.title}));
    remove.addEventListener('click',() => { if(confirm(t('Delete “{title}”?', {title: task.title}))) mutate(async () => { await api(`/${task.id}`,{method:'DELETE'}); tasks = tasks.filter(t => t.id !== task.id); }); });
    row.append(check,body,remove); return row;
  }));
  $('#empty').hidden = filtered.length > 0;
  $('#empty-text').textContent = query ? t('No tasks match your search.') : selectedLabel ? t('No tasks with “{label}” in this view.', {label: selectedLabel}) : view === 'all' ? t('Add your first task and make a start.') : t('No tasks in this view yet.');
  $('#empty-add').hidden = !!query || view === 'completed';
  $('#list-footer').textContent = filtered.length ? t(filtered.length === 1 ? '{count} task · One step closer.' : '{count} tasks · One step closer.', {count: filtered.length}) : '';
}
async function mutate(action) {
  if(busy) return; busy = true; $('#status').textContent = ''; render();
  try { await action(); } catch(error) { message('#status', error.message); }
  finally { busy = false; render(); }
}
function calendarTask(task) {
  const row = node('div', `calendar-task ${task.priority.toLowerCase()}${task.completed ? ' completed' : ''}`);
  const check = node('input'); check.type = 'checkbox'; check.checked = task.completed; check.disabled = busy;
  check.setAttribute('aria-label', t(task.completed ? 'Mark {title} incomplete' : 'Mark {title} complete', {title: task.title}));
  check.addEventListener('change', () => mutate(async () => {
    const updated = await api(`/${task.id}`, {method:'PUT',body:JSON.stringify({...payload(task),completed:check.checked})});
    tasks = tasks.map(t => t.id === updated.id ? updated : t);
  }));
  const button = node('button','calendar-task-title', task.title); button.type = 'button'; button.disabled = busy;
  button.title = `${task.title}\n${t(`${task.priority[0]}${task.priority.slice(1).toLowerCase()} priority`)}${task.labels?.length ? `\n${task.labels.join(', ')}` : ''}`;
  button.setAttribute('aria-label', t(task.dueDate ? 'Edit {title}, due {date}' : 'Edit {title}, no due date', {title: task.title, date: task.dueDate ? dateLabel(task.dueDate) : ''}));
  button.addEventListener('click', () => openEditor(task)); row.append(check, button);
  return row;
}
function renderCalendar(filtered) {
  const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth();
  const overview = calendarOverview(filtered, year, month, selectedCalendarWeek);
  selectedCalendarWeek = overview.week.start;
  $('#calendar-period-tasks').replaceChildren(
    periodCard('WEEKLY', overview.week, periodTasks(filtered, 'WEEKLY', overview.week), overview.weeks),
    periodCard('MONTHLY', overview.month, periodTasks(filtered, 'MONTHLY', overview.month))
  );
  $('#calendar-month').textContent = calendarMonth.toLocaleDateString(locale(), {month:'long',year:'numeric'});
  const {dated, undated} = groupCalendarTasks(filtered.filter(task => !task.taskType || task.taskType === 'DAILY'));
  const elements = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => node('div','calendar-weekday',t(day)));
  let visibleCount = 0;
  for(const date of calendarDays(year, month)) {
    const cell = node('section', `calendar-day${date.inMonth ? '' : ' outside-month'}${date.key === today() ? ' is-today' : ''}`);
    cell.setAttribute('aria-label',dateLabel(date.key));
    const add = node('button','calendar-date',String(date.day)); add.type = 'button'; add.disabled = busy;
    add.setAttribute('aria-label', t('Add task for {date}', {date: dateLabel(date.key)}));
    if(date.key === today()) add.setAttribute('aria-current','date');
    add.addEventListener('click', () => openEditor(null, date.key)); cell.append(add);
    for(const task of dated.get(date.key) || []) { cell.append(calendarTask(task)); visibleCount++; }
    elements.push(cell);
  }
  $('#calendar-grid').replaceChildren(...elements);
  $('#calendar-summary').textContent = t(visibleCount === 1 ? '{count} task on displayed dates · Completed tasks are crossed out.' : '{count} tasks on displayed dates · Completed tasks are crossed out.', {count: visibleCount});
  $('#undated-tasks').replaceChildren(...(undated.length ? undated.map(calendarTask) : [node('p','calendar-hint',t('No unscheduled tasks match your filters.'))]));
}
function periodCard(type, period, periodItems, weeks = null) {
  const card = node('section', 'period-card');
  card.dataset.taskType = type;
  const heading = node('div', 'period-heading');
  heading.append(node('h3', '', t(type === 'WEEKLY' ? 'Week tasks' : 'Month tasks')));
  const add = node('button', 'period-add', t('＋ New task'));
  add.type = 'button'; add.disabled = busy;
  add.addEventListener('click', () => openEditor(null, period.start, type));
  heading.append(add); card.append(heading);
  if (weeks) {
    const select = node('select', 'period-week');
    select.setAttribute('aria-label', t('Week to review'));
    for (const week of weeks) {
      const option = node('option', '', `${dateLabel(week.start)} – ${dateLabel(week.end)}`);
      option.value = week.start; option.selected = week.start === period.start; select.append(option);
    }
    select.addEventListener('change', () => { selectedCalendarWeek = select.value; render(); });
    card.append(select);
  } else card.append(node('p', 'calendar-hint', `${dateLabel(period.start)} – ${dateLabel(period.end)}`));
  const list = node('div', 'period-tasks');
  if (!periodItems.length) list.append(node('p', 'calendar-hint', t('No tasks in this period yet.')));
  for (const task of periodItems) list.append(calendarTask(task));
  card.append(list);
  return card;
}
function openEditor(task = null, dueDate = null, taskType = 'DAILY') {
  if(busy) return; editing = task; $('#task-form').reset(); $('#form-error').textContent = '';
  $('#task-type').value = task?.taskType || taskType;
  updateTaskType();
  updateEditorText();
  if(task) { $('#title').value = task.title; $('#notes').value = task.notes; $('#due-date').value = task.dueDate || ''; $('#priority').value = task.priority; }
  else if(dueDate || ['today','week','month'].includes(view)) $('#due-date').value = dueDate || today();
  taskLabelSelection = new Set(task ? task.labels || [] : view !== 'calendar' && selectedLabel ? [selectedLabel] : []);
  renderTaskLabelOptions();
  $('#task-dialog').showModal(); $('#title').focus();
}
$('#task-form').addEventListener('submit',async event => {
  event.preventDefault(); if(busy) return;
  if(!$('#title').value.trim()) { message('#form-error', 'Please enter a task title.'); return; }
  const taskLabels = [...taskLabelSelection];
  if(taskLabels.length > 10 || taskLabels.some(label => label.length > 40)) { message('#form-error', 'Use up to 10 labels, each at most 40 characters.'); return; }
  busy = true; $('#save').disabled = true; $('#cancel').disabled = true; $('#close-dialog').disabled = true; $('#form-error').textContent = '';
  const input = {title:$('#title').value.trim(), notes:$('#notes').value, dueDate:$('#due-date').value || null, priority:$('#priority').value, completed:editing?.completed || false, labels:taskLabels, taskType:$('#task-type').value};
  try { const saved = await api(editing ? `/${editing.id}` : '',{method:editing ? 'PUT' : 'POST',body:JSON.stringify(input)}); tasks = editing ? tasks.map(t => t.id === saved.id ? saved : t) : [saved,...tasks]; $('#task-dialog').close(); $('#status').textContent = ''; }
  catch(error) { message('#form-error', error.message); }
  finally { busy = false; $('#save').disabled = false; $('#cancel').disabled = false; $('#close-dialog').disabled = false; render(); }
});
function updateTaskType() {
  $('#due-date').required = $('#task-type').value !== 'DAILY';
  $('#task-period-help').textContent = t('For week or month tasks, choose any date in that period.');
}
$('#task-type').addEventListener('change', updateTaskType);
$('#task-dialog').addEventListener('cancel',event => { if(busy) event.preventDefault(); });
for(const id of ['close-dialog','cancel']) $(`#${id}`).addEventListener('click',() => $('#task-dialog').close());
for(const id of ['add-task','empty-add']) $(`#${id}`).addEventListener('click',() => openEditor());
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click',() => { view = button.dataset.view; document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active',b === button)); render(); }));
$('#search').addEventListener('input',render); $('#sort').addEventListener('change',render);
$('#previous-month').addEventListener('click', () => { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()-1, 1, 12); render(); });
$('#next-month').addEventListener('click', () => { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()+1, 1, 12); render(); });
$('#current-month').addEventListener('click', () => { calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12); render(); });
updateDate();
async function load() { message('#status', 'Loading tasks…'); try { [tasks, labelDefinitions] = await Promise.all([api(), api('', {}, '/api/labels')]); $('#status').textContent = ''; render(); } catch(error) { message('#status', error.message); $('#status').dataset.retry = 'true'; $('#status').textContent += ` ${t('Refresh to retry.')}`; } }
function updateDate() { $('#date').textContent = new Date().toLocaleDateString(locale(), {weekday:'short',month:'short',day:'numeric'}); }
function updateEditorText() {
  $('#dialog-title').textContent = t(editing ? 'Edit task' : 'New task');
  $('#save').textContent = t(editing ? 'Save changes' : 'Create task');
}
window.addEventListener('languagechange', () => {
  updateDate(); updateEditorText(); updateTaskType(); render(); renderTaskLabelOptions(); renderLabelDefinitions(); updateLabelPreview(); updateLabelFormText();
  for (const selector of ['#status', '#form-error', '#label-error']) {
    const el = $(selector);
    if (el.textContent && el.dataset.message) el.textContent = t(el.dataset.message) + (el.dataset.retry ? ` ${t('Refresh to retry.')}` : '');
  }
});

function renderTaskLabelOptions() {
  const names = [...new Set([...allLabels(), ...taskLabelSelection])].sort();
  $('#task-label-options').replaceChildren(...names.map(name => {
    const selected = taskLabelSelection.has(name);
    const chip = decorateLabel(node('button', `label-chip${selected ? ' selected' : ''}`, `# ${name}`), name);
    chip.type = 'button'; chip.setAttribute('aria-pressed', String(selected));
    chip.disabled = busy || (!selected && taskLabelSelection.size >= 10);
    chip.addEventListener('click', () => {
      if (taskLabelSelection.has(name)) taskLabelSelection.delete(name); else taskLabelSelection.add(name);
      renderTaskLabelOptions();
    });
    return chip;
  }));
  if (!names.length) $('#task-label-options').append(node('p', 'calendar-hint', t('No labels yet. Create your first label.')));
}
function updateLabelFormText() {
  $('#save-label').textContent = t(editingLabelId === null ? 'Create label' : 'Save color');
}
function updateLabelPreview() {
  const color = $('#label-color-hex').value;
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    $('#label-color').value = color;
    const palette = labelPalette(color);
    const preview = $('#label-preview');
    preview.textContent = `# ${$('#label-name').value.trim() || t('Label name')}`;
    preview.style.background = palette.color; preview.style.color = palette.selectedText; preview.style.borderColor = palette.color;
  }
  $('#label-color-presets').replaceChildren(...labelPresets.map(color => {
    const button = node('button', 'color-swatch'); button.type = 'button';
    button.style.background = color; button.dataset.color = color; button.setAttribute('aria-label', `${t('Color')} ${color}`);
    button.setAttribute('aria-pressed', String(color.toLowerCase() === $('#label-color-hex').value.toLowerCase()));
    button.addEventListener('click', () => { $('#label-color-hex').value = color; updateLabelPreview(); $('#label-color-presets').querySelector(`[data-color="${color}"]`).focus(); });
    return button;
  }));
}
function resetLabelForm() {
  editingLabelId = null; $('#label-form').reset(); $('#label-name').disabled = false;
  $('#cancel-label-edit').hidden = true; $('#label-error').textContent = ''; updateLabelFormText(); updateLabelPreview();
}
function setLabelBusy(value) {
  labelBusy = value;
  for (const el of $('#label-dialog').querySelectorAll('button, input')) el.disabled = value;
  $('#label-name').disabled = value || editingLabelId !== null;
}
function renderLabelDefinitions() {
  $('#label-definition-list').replaceChildren(...labelDefinitions.slice().sort((a,b) => a.name.localeCompare(b.name)).map(label => {
    const row = node('div', 'label-definition-row');
    const chip = decorateLabel(node('span', 'label-chip', `# ${label.name}`), label.name);
    const edit = node('button', 'text-button', t('Edit color')); edit.type = 'button';
    edit.setAttribute('aria-label', t('Edit color for {label}', {label: label.name}));
    edit.addEventListener('click', () => {
      editingLabelId = label.id; $('#label-name').value = label.name; $('#label-name').disabled = true;
      $('#label-color-hex').value = label.color; $('#cancel-label-edit').hidden = false;
      $('#label-error').textContent = ''; updateLabelFormText(); updateLabelPreview(); $('#label-color').focus();
    });
    const remove = node('button', 'text-button', t('Delete label')); remove.type = 'button';
    remove.setAttribute('aria-label', t('Delete label {label}', {label: label.name}));
    remove.addEventListener('click', async () => {
      if (labelBusy || !confirm(t('Delete label “{label}” from all tasks? Tasks will be kept.', {label: label.name}))) return;
      setLabelBusy(true); $('#label-error').textContent = '';
      try {
        await api(`/${label.id}`, {method:'DELETE'}, '/api/labels');
        labelDefinitions = labelDefinitions.filter(item => item.id !== label.id);
        tasks.forEach(task => { task.labels = (task.labels || []).filter(name => name !== label.name); });
        taskLabelSelection.delete(label.name); if (selectedLabel === label.name) selectedLabel = '';
        if (editingLabelId === label.id) resetLabelForm();
        render(); renderTaskLabelOptions(); renderLabelDefinitions();
      } catch(error) { message('#label-error', error.message); }
      finally { setLabelBusy(false); }
    });
    row.append(chip, edit, remove); return row;
  }));
  if (!labelDefinitions.length) $('#label-definition-list').append(node('p', 'calendar-hint', t('No labels yet. Create your first label.')));
}
for (const id of ['manage-labels', 'editor-manage-labels']) $(`#${id}`).addEventListener('click', () => {
  if (busy || labelBusy) return;
  resetLabelForm(); renderLabelDefinitions(); $('#label-dialog').showModal(); $('#label-name').focus();
});
$('#close-label-dialog').addEventListener('click', () => { if (!labelBusy) $('#label-dialog').close(); });
$('#label-dialog').addEventListener('cancel', event => { if (labelBusy) event.preventDefault(); });
$('#cancel-label-edit').addEventListener('click', resetLabelForm);
$('#label-name').addEventListener('input', updateLabelPreview);
$('#label-color').addEventListener('input', () => { $('#label-color-hex').value = $('#label-color').value; updateLabelPreview(); });
$('#label-color-hex').addEventListener('input', updateLabelPreview);
$('#label-form').addEventListener('submit', async event => {
  event.preventDefault(); if (labelBusy) return;
  const name = $('#label-name').value.trim().toLowerCase(), color = $('#label-color-hex').value;
  if (!name || name.length > 40 || !/^#[0-9a-f]{6}$/i.test(color)) { message('#label-error', 'Use a name of 1–40 characters and a color like #39a765.'); return; }
  setLabelBusy(true); $('#label-error').textContent = '';
  try {
    const saved = await api(editingLabelId === null ? '' : `/${editingLabelId}`, {method:editingLabelId === null ? 'POST' : 'PUT', body:JSON.stringify({name, color})}, '/api/labels');
    labelDefinitions = [...labelDefinitions.filter(label => label.id !== saved.id), saved];
    resetLabelForm(); render(); renderTaskLabelOptions(); renderLabelDefinitions();
  } catch(error) { message('#label-error', error.message); }
  finally { setLabelBusy(false); }
});
load();
