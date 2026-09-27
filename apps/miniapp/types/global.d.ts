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
declare const CLOUDBASE_ENV_ID: string;
declare const CLOUDBASE_SERVICE_NAME: string;
declare const LEGAL_OPERATOR_NAME: string;
declare const LEGAL_PRIVACY_CONTACT: string;
declare const LEGAL_COMPLAINT_CONTACT: string;
declare const LEGAL_COMPLAINT_RESPONSE_TIME: string;
declare const LEGAL_AGE_SCOPE: string;
declare const LEGAL_STORAGE_REGION: string;
declare const LEGAL_RETENTION_DESCRIPTION: string;
declare const MINIPROGRAM_FILING_NO: string;
declare const DEEPSEEK_MODEL: string;
declare const DEEPSEEK_SERVICE_FILING_NO: string;
declare const DEEPSEEK_ALGORITHM_FILING_NO: string;
declare const DEEPSEEK_DATA_HANDLING: string;
declare const DEEPSEEK_DATA_REGION: string;

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production";
    TARO_ENV: "weapp" | "h5" | "swan" | "alipay" | "tt" | "rn" | "qq" | "jd";
    TARO_APP_ID: string;
  }
}
