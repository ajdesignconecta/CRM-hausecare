let appPromise: Promise<any> | null = null;

export async function getBackendApp(): Promise<any> {
  if (!appPromise) {
    appPromise = (async () => {
      // @ts-expect-error Loaded at runtime from backend build output.
      const mod: any = await import("../../../backend/dist/app.js");
      const app = await mod.buildApp();
      await app.ready();
      return app;
    })();
  }
  return appPromise;
}
