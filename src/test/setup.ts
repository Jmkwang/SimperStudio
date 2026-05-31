import '@testing-library/jest-dom';

// jsdom does not support Web Workers. Provide a minimal synchronous mock so
// that codeExecutor.ts can run in the test environment without crashing.
// The mock executes the posted code inline (same tick) using AsyncFunction,
// which is safe for unit tests that don't need true isolation.
if (typeof Worker === 'undefined') {
  class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    onerror: ((e: ErrorEvent) => void) | null = null;

    postMessage(data: any) {
      const { code, payload, id } = data;
      // Run async so the caller's onmessage handler is already set
      Promise.resolve().then(async () => {
        try {
          // eslint-disable-next-line no-new-func
          const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
          const fn = new AsyncFunction('payload', code);
          const result = await fn(payload);
          this.onmessage?.({ data: { id, success: true, result } } as MessageEvent);
        } catch (err: any) {
          this.onmessage?.({ data: { id, success: false, error: err.message } } as MessageEvent);
        }
      });
    }

    terminate() {}
  }

  // @ts-expect-error — intentional global mock for test environment
  global.Worker = MockWorker;
}

// URL.createObjectURL is not available in jsdom; stub it so createCodeWorker
// doesn't throw before we even reach the Worker constructor.
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = () => 'blob:mock';
}
