import { buildApp } from "./app.js";
import { env } from "./lib/env.js";

const bootstrap = async () => {
  const app = await buildApp();

  try {
    await app.listen({
      port: env.PORT,
      host: "0.0.0.0"
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

bootstrap();
