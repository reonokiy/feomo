const { getDefaultConfig } = require("expo/metro-config");
const { resolve } = require("metro-resolver");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");
const sharedSrcRoot = path.resolve(workspaceRoot, "src");

const config = getDefaultConfig(projectRoot);

config.watchFolders = Array.from(new Set([...(config.watchFolders ?? []), workspaceRoot]));

config.resolver = {
  ...(config.resolver ?? {}),
  nodeModulesPaths: [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
  ],
  disableHierarchicalLookup: true,
};

config.resolver.alias = {
  ...((config.resolver ?? {}).alias ?? {}),
  "@": sharedSrcRoot,
  "@feomo": sharedSrcRoot,
  "@mobile": projectRoot,
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@/")) {
    const candidate = path.join(sharedSrcRoot, moduleName.slice(2));
    return resolve(context, candidate, platform);
  }

  if (moduleName.startsWith("@feomo/")) {
    const candidate = path.join(sharedSrcRoot, moduleName.slice("@feomo/".length));
    return resolve(context, candidate, platform);
  }

  return resolve(context, moduleName, platform);
};

module.exports = config;
