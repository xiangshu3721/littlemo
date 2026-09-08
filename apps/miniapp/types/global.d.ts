/// <reference types="@tarojs/taro" />

declare module "*.png";
declare module "*.gif";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.svg";
declare module "*.css";
declare module "*.less";
declare module "*.scss";
declare module "*.sass";

/** Public API origin injected at build time. Never a secret. */
declare const API_BASE_URL: string;

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production";
    TARO_ENV: "weapp" | "h5" | "swan" | "alipay" | "tt" | "rn" | "qq" | "jd";
    TARO_APP_ID: string;
  }
}
