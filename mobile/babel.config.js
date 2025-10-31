const path = require("path");

const projectRoot = path.resolve(path.dirname(''));
const workspaceRoot = path.resolve(projectRoot, "..");
const sharedSrcRoot = path.resolve(workspaceRoot, "src");

module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: [projectRoot, workspaceRoot],
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
          alias: {
            "@/": `${sharedSrcRoot}/`,
            "@": sharedSrcRoot,
            "@feomo/": `${sharedSrcRoot}/`,
            "@feomo": sharedSrcRoot,
            "@mobile": projectRoot,
            "@mobile/": `${projectRoot}/`,
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
