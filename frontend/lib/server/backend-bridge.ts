let appPromise: Promise<any> | null = null;

export async function getBackendApp(): Promise<any> {
  if (!appPromise) {
    appPromise = (async () => {
      try {
        // @ts-expect-error Loaded at runtime from backend build output.
        const mod: any = await import("../../../backend/dist/app.js");
        const app = await mod.buildApp();
        await app.ready();
        return app;
      } catch (error: any) {
        console.error("[backend-bridge] failed to load backend app", {
          message: error?.message,
          stack: error?.stack
        });
        throw error;
      }
    })();
  }
  return appPromise;
}
