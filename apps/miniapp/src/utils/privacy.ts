import Taro from "@tarojs/taro";

/** Ask WeChat to show its official privacy authorization prompt when needed. */
export function ensurePrivacyAuthorized() {
  if (process.env.TARO_ENV !== "weapp") return Promise.resolve(true);
  if (typeof Taro.getPrivacySetting !== "function" || typeof Taro.requirePrivacyAuthorize !== "function") {
    Taro.showModal({
      title: "需要微信隐私授权",
      content: "当前微信版本暂不支持隐私授权流程。请更新微信后重试。",
      showCancel: false,
    });
    return Promise.resolve(false);
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
        fail: () => {
          Taro.showToast({ title: "隐私授权状态暂时无法确认。", icon: "none" });
          finish(false);
        },
      });
    } catch {
      Taro.showToast({ title: "隐私授权状态暂时无法确认。", icon: "none" });
      finish(false);
    }
  });
}
