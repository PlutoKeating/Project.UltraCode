declare const Bun: {
  isStandaloneExecutable: boolean;
  file(path: string): {
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
  };
  build(options: Record<string, unknown>): Promise<{ success: boolean; logs: string[] }>;
};

declare module "*.md" {
  const content: string;
  export default content;
}
declare module "*.sh" {
  const content: string;
  export default content;
}
declare module "*gitignore" {
  const content: string;
  export default content;
}

declare module "bun:test" {
  export const afterEach: (...args: any[]) => any;
  export const beforeEach: (...args: any[]) => any;
  export const describe: (...args: any[]) => any;
  export const expect: (...args: any[]) => any;
  export const test: (...args: any[]) => any;
}
