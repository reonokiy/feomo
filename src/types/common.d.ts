type FunctionType = (...args: unknown[]) => unknown;

declare global {
  // Exposed when running in the Vite (web) environment so shared config logic can read env values
  // without referencing import.meta directly. Mobile builds ignore this value.
  // eslint-disable-next-line no-var
  var __APP_META_ENV__: (Record<string, string | undefined> & { [key: string]: string | undefined }) | undefined;
}

export {};
