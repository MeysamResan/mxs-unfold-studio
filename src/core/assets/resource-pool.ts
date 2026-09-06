interface Entry<T> {
  promise: Promise<T>;
  resource?: T;
  references: number;
  touched: number;
  controller: AbortController;
}

/** Leases separate component lifetime from GPU lifetime, including StrictMode remounts. */
export class ResourcePool<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private clock = 0;

  constructor(
    private readonly load: (key: string, signal: AbortSignal) => Promise<T>,
    private readonly dispose: (resource: T) => void,
    private readonly idleLimit = 0,
  ) {}

  acquire(key: string): { promise: Promise<T>; release: () => void } {
    let entry = this.entries.get(key);
    if (!entry) {
      const controller = new AbortController();
      const created: Entry<T> = {
        promise: Promise.resolve(undefined as T),
        references: 0,
        touched: ++this.clock,
        controller,
      };
      created.promise = this.load(key, controller.signal)
        .then((resource) => {
          created.resource = resource;
          this.trim();
          return resource;
        })
        .catch((error: unknown) => {
          if (this.entries.get(key) === created) this.entries.delete(key);
          throw error;
        });
      this.entries.set(key, created);
      entry = created;
    }
    entry.references += 1;
    entry.touched = ++this.clock;
    let released = false;
    return {
      promise: entry.promise,
      release: () => {
        if (released) return;
        released = true;
        entry.references -= 1;
        // Allow an immediate React remount to reclaim the same in-flight lease.
        queueMicrotask(() => this.trim());
      },
    };
  }

  private trim(): void {
    const idle = [...this.entries.entries()]
      .filter(([, entry]) => entry.references === 0)
      .sort(([, a], [, b]) => b.touched - a.touched);
    for (const [key, entry] of idle.slice(this.idleLimit)) {
      this.entries.delete(key);
      entry.controller.abort();
      if (entry.resource) this.dispose(entry.resource);
      else
        void entry.promise
          .then((resource) => {
            // A decoder may finish after its fetch is aborted.
            if (entry.resource === resource) this.dispose(resource);
          })
          .catch(() => undefined);
    }
  }
}
