if (typeof globalThis !== "undefined") {
  const AbortSignalRef = (globalThis as typeof globalThis & { AbortSignal?: typeof AbortSignal }).AbortSignal;

  if (AbortSignalRef && typeof (AbortSignalRef as any).any !== "function") {
    (AbortSignalRef as any).any = function polyfillAbortSignalAny(signals: AbortSignal[]): AbortSignal {
      if (!Array.isArray(signals)) {
        throw new TypeError("AbortSignal.any requires an array of AbortSignal instances.");
      }

      const controller = new AbortController();

      const abortFromSignal = (signal: AbortSignal) => {
        if (!(signal instanceof AbortSignalRef)) {
          throw new TypeError("Value passed to AbortSignal.any is not an AbortSignal.");
        }

        const abortHandler = () => {
          if (!controller.signal.aborted) {
            controller.abort(signal.reason);
          }
        };

        if (signal.aborted) {
          abortHandler();
        } else {
          signal.addEventListener("abort", abortHandler, { once: true });
        }
      };

      signals.forEach(abortFromSignal);
      return controller.signal;
    };
  }
}
