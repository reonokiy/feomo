export {};

declare global {
  interface ImportMetaEnv {
    readonly [key: string]: string | undefined;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

declare module "*.css?raw" {
  const content: string;
  export default content;
}
