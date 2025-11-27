export type TelemetryEvent = {
  name: string;
  timestamp: number;
  data?: Record<string, unknown>;
};

export class TelemetryRecorder {
  private events: TelemetryEvent[] = [];

  constructor(private readonly maxEvents = 200) {}

  recordEvent(name: string, data?: Record<string, unknown>): TelemetryEvent {
    const event: TelemetryEvent = {
      name,
      timestamp: Date.now(),
      data,
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    return event;
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  flush(): TelemetryEvent[] {
    const snapshot = this.getEvents();
    this.events = [];
    return snapshot;
  }
}

export const telemetry = new TelemetryRecorder();
