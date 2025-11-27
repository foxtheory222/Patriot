import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { TelemetryRecorder } from '../src/telemetry.js';

test('records and returns events', () => {
  const recorder = new TelemetryRecorder();
  const event = recorder.recordEvent('game_start', { difficulty: 'normal' });

  assert.equal(event.name, 'game_start');
  assert.ok(event.timestamp > 0);
  assert.deepEqual(recorder.getEvents()[0].data, { difficulty: 'normal' });
});

test('trims history when exceeding max events', () => {
  const recorder = new TelemetryRecorder(3);
  recorder.recordEvent('e1');
  recorder.recordEvent('e2');
  recorder.recordEvent('e3');
  recorder.recordEvent('e4');

  const names = recorder.getEvents().map((event) => event.name);
  assert.deepEqual(names, ['e2', 'e3', 'e4']);
});

test('flush clears previously captured events', () => {
  const recorder = new TelemetryRecorder();
  recorder.recordEvent('one');
  recorder.recordEvent('two');

  const flushed = recorder.flush();
  assert.equal(flushed.length, 2);
  assert.equal(recorder.getEvents().length, 0);
});
