import { defineConfig } from "@tarojs/cli";
import devConfig from "./dev";
import prodConfig from "./prod";

const apiBase = JSON.stringify(
  process.env.NODE_ENV === "production" ? "" : process.env.API_BASE_URL || "http://127.0.0.1:3000",
);
const cloudbaseEnvId = JSON.stringify(process.env.CLOUDBASE_ENV_ID || "");
const cloudbaseServiceName = JSON.stringify(process.env.CLOUDBASE_SERVICE_NAME || "littlemo-api");

export default defineConfig(async (merge) => {
  const baseConfig = {
    projectName: "littlemo-miniapp",
    date: "2026-9-8",
    designWidth: 375,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2,
    },
    sourceRoot: "src",
    outputRoot: "dist",
    plugins: [],
    defineConstants: {
      API_BASE_URL: apiBase,
      CLOUDBASE_ENV_ID: cloudbaseEnvId,
      CLOUDBASE_SERVICE_NAME: cloudbaseServiceName,
    },
    copy: {
      patterns: [{ from: "src/assets/", to: "assets/" }],
      options: {},
    },
    framework: "react",
    compiler: "webpack5",
    cache: {
      enable: false,
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {},
        },
        url: {
          enable: true,
          config: {
            limit: 1024,
          },
        },
        cssModules: {
          enable: false,
        },
      },
    },
    h5: {
      publicPath: "/",
      staticDirectory: "static",
      output: {
        filename: "js/[name].[hash:8].js",
        chunkFilename: "js/[name].[chunkhash:8].js",
      },
      router: {
        mode: "hash",
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
        },
      },
    },
  };

  if (process.env.NODE_ENV === "development") {
    return merge({}, baseConfig, devConfig);
  }
  return merge({}, baseConfig, prodConfig);
});
