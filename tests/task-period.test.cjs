const { test } = require('node:test');
const assert = require('node:assert/strict');
const { taskPeriod, matchesTaskView } = require('../src/main/resources/static/calendar.js');
const local = date => new Date(`${date}T12:00:00`);

test('week covers Monday through Sunday, including a month boundary', () => {
  for (const day of ['2026-10-26','2026-10-28','2026-11-01']) {
    assert.deepEqual(taskPeriod('week', local(day)), { start:'2026-10-26', end:'2026-11-01' });
  }
  assert.deepEqual(taskPeriod('week', local('2026-11-02')), { start:'2026-11-02', end:'2026-11-08' });
  assert.deepEqual(taskPeriod('week', local('2027-01-01')), { start:'2026-12-28', end:'2027-01-03' });
});

test('month handles leap years and December', () => {
  assert.deepEqual(taskPeriod('month', local('2024-02-20')), { start:'2024-02-01', end:'2024-02-29' });
  assert.deepEqual(taskPeriod('month', local('2026-02-20')), { start:'2026-02-01', end:'2026-02-28' });
  assert.deepEqual(taskPeriod('month', local('2026-12-20')), { start:'2026-12-01', end:'2026-12-31' });
});

test('period views include overdue tasks within period and exclude completed or undated tasks', () => {
  const reference = local('2026-11-04');
  const task = dueDate => ({ dueDate, completed:false });
  for (const [view, start, end, before, after] of [
    ['week','2026-11-02','2026-11-08','2026-11-01','2026-11-09'],
    ['month','2026-11-01','2026-11-30','2026-10-31','2026-12-01']
  ]) {
    for (const date of [start, end, '2026-11-04']) assert.equal(matchesTaskView(task(date), view, reference), true);
    for (const date of [before, after, null]) assert.equal(matchesTaskView(task(date), view, reference), false);
    assert.equal(matchesTaskView({ ...task(start), completed:true }, view, reference), false);
  }
});

test('existing views keep their behavior', () => {
  const reference = local('2026-11-04');
  const task = { dueDate:'2026-11-04', completed:false };
  assert.equal(matchesTaskView(task, 'today', reference), true);
  assert.equal(matchesTaskView(task, 'upcoming', reference), false);
  assert.equal(matchesTaskView({...task, dueDate:'2026-11-05'}, 'upcoming', reference), true);
  assert.equal(matchesTaskView({...task, completed:true}, 'completed', reference), true);
  for (const view of ['all','calendar']) assert.equal(matchesTaskView({...task, dueDate:null, completed:true}, view, reference), true);
});
