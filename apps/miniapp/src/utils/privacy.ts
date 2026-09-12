import Taro from "@tarojs/taro";

/** Ask WeChat to show its official privacy authorization prompt when needed. */
export function ensurePrivacyAuthorized() {
  if (process.env.TARO_ENV !== "weapp") return Promise.resolve(true);
  if (typeof Taro.getPrivacySetting !== "function" || typeof Taro.requirePrivacyAuthorize !== "function") {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (allowed: boolean) => {
      if (settled) return;
      settled = true;
      resolve(allowed);
    };

    try {
      Taro.getPrivacySetting({
        success: (result) => {
          if (!result.needAuthorization) {
            finish(true);
            return;
          }
          Taro.requirePrivacyAuthorize({
            success: () => finish(true),
            fail: () => finish(false),
          });
        },
        // Older base libraries may not expose the privacy API. Let the
        // underlying image API keep its native behavior in that case.
        fail: () => finish(true),
      });
    } catch {
      finish(true);
    }
  });
}
