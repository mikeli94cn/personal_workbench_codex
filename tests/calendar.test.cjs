const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calendarDays, calendarDateKey, groupCalendarTasks } = require('../src/main/resources/static/calendar.js');

test('leap February includes 29 days and starts weeks on Monday', () => {
  const days = calendarDays(2024, 1);
  assert.equal(days[0].key, '2024-01-29');
  assert.equal(days.at(-1).key, '2024-03-03');
  assert.equal(days.filter(d => d.inMonth).length, 29);
  assert.equal(days.find(d => d.key === '2024-02-29').day, 29);
});

test('six-week month and December/January boundaries are complete', () => {
  const days = calendarDays(2026, 10);
  assert.equal(days.length, 42);
  assert.equal(days[0].key, '2026-10-26');
  assert.equal(days.at(-1).key, '2026-12-06');
  assert.equal(calendarDays(2027, 0)[0].key, '2026-12-28');
  assert.equal(calendarDays(2026, 12).filter(d => d.inMonth).length, 31);
});

test('local dates stay consecutive through daylight-saving changes', () => {
  for(const month of [2, 10]) {
    const days = calendarDays(2026, month);
    assert.equal(new Set(days.map(d => d.key)).size, days.length);
    for(let i = 1; i < days.length; i++) {
      const previous = new Date(`${days[i-1].key}T12:00:00`);
      previous.setDate(previous.getDate()+1);
      assert.equal(days[i].key, calendarDateKey(previous));
    }
  }
});

test('calendar keeps completed tasks and separates unscheduled tasks', () => {
  const tasks = [
    {id:1, dueDate:'2026-11-01', completed:false},
    {id:2, dueDate:'2026-11-01', completed:true},
    {id:3, dueDate:null},
    {id:4, dueDate:'2026-12-01'}
  ];
  const {dated, undated} = groupCalendarTasks(tasks);
  assert.deepEqual(dated.get('2026-11-01').map(t => t.id), [1,2]);
  assert.deepEqual(undated.map(t => t.id), [3]);
  assert.deepEqual(dated.get('2026-12-01').map(t => t.id), [4]);
  assert.deepEqual(groupCalendarTasks([]).undated, []);
});
