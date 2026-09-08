import { View, Text, Button } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useState } from "react";
import { clearSession, getUser, isLoggedIn } from "../../utils/session";
import "./index.scss";

export default function MinePage() {
  const [name, setName] = useState("未登录");

  useDidShow(() => {
    if (!isLoggedIn()) {
      Taro.redirectTo({ url: "/pages/login/index" });
      return;
    }
    const user = getUser();
    setName(user?.nickname || "有点情绪");
  });

  function onPrivacy() {
    Taro.showModal({
      title: "隐私",
      content: "记录存在你的账号里。密钥只放在服务器。小程序不做情绪洞察、周报或分析。",
      showCancel: false,
      confirmText: "知道了",
      confirmColor: "#5f6f52",
    });
  }

  function onLogout() {
    Taro.showModal({
      title: "退出",
      content: "退出后，这台设备上的登录状态会清掉。记录仍留在云端。",
      confirmText: "退出",
      confirmColor: "#8a4a42",
      success: (res) => {
        if (!res.confirm) return;
        clearSession();
        Taro.redirectTo({ url: "/pages/login/index" });
      },
    });
  }

  return (
    <View className="mine">
      <Text className="mine__mark">只陪这一刻</Text>
      <View className="mine__card">
        <View className="mine__avatar" />
        <Text className="mine__name">{name}</Text>
      </View>
      <Button className="mine__row" onClick={onPrivacy}>
        隐私说明
      </Button>
      <Button className="mine__row mine__row--last" onClick={onLogout}>
        退出登录
      </Button>
      <Text className="mine__foot">V1 不做情绪洞察。网页版的分析接口不会在这里调用。</Text>
    </View>
  );
}
