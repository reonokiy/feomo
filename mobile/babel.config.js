const path = require("path");

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          extensions: [".ts", ".tsx", ".js", ".json"],
          alias: {
            "@": path.resolve(__dirname, "../src"),
          },
        },
      ],
    ],
  };
};
