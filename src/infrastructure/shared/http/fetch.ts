export type FetchFn = (input: any, init?: any) => Promise<any>;

let cachedFetch: FetchFn | null = null;

export async function resolveFetch(): Promise<FetchFn> {
  if (cachedFetch) {
    return cachedFetch;
  }

  if (typeof globalThis.fetch === "function") {
    cachedFetch = globalThis.fetch.bind(globalThis) as FetchFn;
    return cachedFetch;
  }

  const dynamicImport = new Function('modulePath', 'return import(modulePath);');
  const module: any = await dynamicImport('node-fetch');
  const fetchFn: FetchFn = module.default ?? module;

  cachedFetch = fetchFn;
  return cachedFetch;
}
