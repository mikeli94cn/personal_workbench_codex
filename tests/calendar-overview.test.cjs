const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calendarOverview } = require('../src/main/resources/static/calendar.js');
const local = date => new Date(`${date}T12:00:00`);
const task = (id, dueDate, completed = false) => ({ id, dueDate, completed });

test('overview defaults to current week and excludes completed and undated tasks', () => {
  const tasks = [task(1, '2026-11-02'), task(2, '2026-11-08'), task(3, '2026-11-30'),
    task(4, '2026-11-04', true), task(5, null), task(6, '2026-12-01')];
  const result = calendarOverview(tasks, 2026, 10, null, local('2026-11-04'));
  assert.deepEqual(result.week, { start: '2026-11-02', end: '2026-11-08' });
  assert.deepEqual(result.weekly.map(t => t.id), [1, 2]);
  assert.deepEqual(result.monthly.map(t => t.id), [1, 2, 3]);
});

test('selected week includes dates outside the month without adding them to monthly tasks', () => {
  const tasks = [task(1, '2026-10-26'), task(2, '2026-11-01'), task(3, '2026-11-02')];
  const result = calendarOverview(tasks, 2026, 10, '2026-10-26', local('2026-11-04'));
  assert.deepEqual(result.weekly.map(t => t.id), [1, 2]);
  assert.deepEqual(result.monthly.map(t => t.id), [2, 3]);
});

test('navigation resets an unavailable week and handles leap months and year boundaries', () => {
  const leap = calendarOverview([task(1, '2024-02-29')], 2024, 1, '2026-11-02', local('2026-11-04'));
  assert.deepEqual(leap.month, { start: '2024-02-01', end: '2024-02-29' });
  assert.equal(leap.week.start, '2024-01-29');
  assert.equal(leap.monthly.length, 1);
  const december = calendarOverview([task(1, '2027-01-03')], 2026, 11, '2026-12-28');
  assert.deepEqual(december.week, { start: '2026-12-28', end: '2027-01-03' });
  assert.equal(december.weekly.length, 1);
  assert.equal(december.monthly.length, 0);
});

test('overview preserves the filtered input order for both lists', () => {
  const filtered = [task(3, '2026-11-06'), task(1, '2026-11-02')];
  const result = calendarOverview(filtered, 2026, 10, null, local('2026-11-04'));
  assert.deepEqual(result.weekly, filtered);
  assert.deepEqual(result.monthly, filtered);
});
