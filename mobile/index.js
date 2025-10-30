import { registerRootComponent } from "expo";
import { initializeNativeEnvironment } from "./src/environment/native";

async function bootstrap() {
  await initializeNativeEnvironment();
  const App = (await import("./src/App")).default;
  registerRootComponent(App);
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap mobile application:", error);
});
