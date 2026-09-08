export default defineAppConfig({
  pages: ["pages/index/index", "pages/mine/index", "pages/login/index"],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#f7f7f7",
    navigationBarTitleText: "碎碎念",
    navigationBarTextStyle: "black",
    backgroundColor: "#e8e8e6",
  },
  tabBar: {
    color: "#999999",
    selectedColor: "#5f6f52",
    backgroundColor: "#f7f7f7",
    borderStyle: "white",
    list: [
      {
        pagePath: "pages/index/index",
        text: "碎碎念",
      },
      {
        pagePath: "pages/mine/index",
        text: "我的",
      },
    ],
  },
});
