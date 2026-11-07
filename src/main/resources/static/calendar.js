// Local calendar dates avoid timezone shifts around UTC midnight and daylight saving.
function calendarDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function calendarDays(year, month) {
  const first = new Date(year, month, 1, 12);
  const offset = (first.getDay() + 6) % 7; // Monday first.
  const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
  const count = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(year, month, 1 - offset + index, 12);
    return { key: calendarDateKey(date), day: date.getDate(), inMonth: date.getMonth() === first.getMonth() };
  });
}

function groupCalendarTasks(tasks) {
  const dated = new Map(), undated = [];
  for (const task of tasks) {
    if (!task.dueDate) undated.push(task);
    else {
      if (!dated.has(task.dueDate)) dated.set(task.dueDate, []);
      dated.get(task.dueDate).push(task);
    }
  }
  return { dated, undated };
}

function taskPeriod(view, reference = new Date()) {
  const year = reference.getFullYear(), month = reference.getMonth(), day = reference.getDate();
  if (view === 'week') {
    const monday = day - (reference.getDay() + 6) % 7;
    return { start: calendarDateKey(new Date(year, month, monday, 12)), end: calendarDateKey(new Date(year, month, monday + 6, 12)) };
  }
  if (view === 'month') {
    return { start: calendarDateKey(new Date(year, month, 1, 12)), end: calendarDateKey(new Date(year, month + 1, 0, 12)) };
  }
  return null;
}

function matchesTaskView(task, view, reference = new Date()) {
  if (view === 'all' || view === 'calendar') return true;
  if (view === 'completed') return task.completed;
  if (task.completed || !task.dueDate) return false;
  const period = taskPeriod(view, reference);
  if (period) return task.dueDate >= period.start && task.dueDate <= period.end;
  if (view === 'today') return task.dueDate === calendarDateKey(reference);
  return view === 'upcoming' && task.dueDate > calendarDateKey(reference);
}

function calendarOverview(tasks, year, month, selectedWeek, reference = new Date()) {
  const days = calendarDays(year, month);
  const weeks = days.filter((_, index) => index % 7 === 0).map(day => taskPeriod('week', new Date(`${day.key}T12:00:00`)));
  const currentWeek = taskPeriod('week', reference).start;
  const week = weeks.find(period => period.start === selectedWeek)
    || weeks.find(period => period.start === currentWeek) || weeks[0];
  const monthPeriod = taskPeriod('month', new Date(year, month, 1, 12));
  const within = period => tasks.filter(task => !task.completed && task.dueDate && task.dueDate >= period.start && task.dueDate <= period.end);
  return { weeks, week, month: monthPeriod, weekly: within(week), monthly: within(monthPeriod) };
}

if (typeof module !== 'undefined') module.exports = { calendarDateKey, calendarDays, groupCalendarTasks, taskPeriod, matchesTaskView, calendarOverview };

function periodTasks(tasks, type, period) {
  return tasks.filter(task => (task.taskType || 'DAILY') === type && task.dueDate && task.dueDate >= period.start && task.dueDate <= period.end);
}
if (typeof module !== 'undefined') module.exports.periodTasks = periodTasks;
