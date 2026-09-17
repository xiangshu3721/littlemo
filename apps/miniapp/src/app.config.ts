const pages = [
    "pages/index/index",
    "pages/diary/index",
    "pages/insight/index",
    "pages/mine/index",
    "pages/login/index",
    "pages/legal/index",
] as string[];

// Temporary production self-check page. It is intentionally absent from every
// production mini-program build and is not part of the tab bar.
if (process.env.TARO_ENV === "weapp" && process.env.NODE_ENV !== "production") {
  pages.push("pages/diagnostics/index");
}

export default defineAppConfig({
  pages,
  sitemapLocation: "sitemap.json",
  requiredPrivateInfos: ["chooseImage", "chooseAvatar"],
  __usePrivacyCheck__: true,
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#f7f7f7",
    navigationBarTitleText: "有点情绪",
    navigationBarTextStyle: "black",
    backgroundColor: "#e8e8e6",
  },
  permission: {
    "scope.camera": {
      desc: "用来拍一张此刻的照片，放进对话或换成头像。",
    },
  },
  tabBar: {
    color: "#999999",
    selectedColor: "#5f6f52",
    backgroundColor: "#f7f7f7",
    borderStyle: "white",
    list: [
      {
        pagePath: "pages/index/index",
        text: "有点情绪",
        iconPath: "assets/tab/chat.png",
        selectedIconPath: "assets/tab/chat-active.png",
      },
      {
        pagePath: "pages/diary/index",
        text: "情绪日记",
        iconPath: "assets/tab/diary.png",
        selectedIconPath: "assets/tab/diary-active.png",
      },
      {
        pagePath: "pages/insight/index",
        text: "情绪洞察",
        iconPath: "assets/tab/insight.png",
        selectedIconPath: "assets/tab/insight-active.png",
      },
      {
        pagePath: "pages/mine/index",
        text: "我的",
        iconPath: "assets/tab/mine.png",
        selectedIconPath: "assets/tab/mine-active.png",
      },
    ],
  },
});
