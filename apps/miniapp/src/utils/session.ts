import Taro from "@tarojs/taro";

const TOKEN_KEY = "littlemo.token";
const USER_KEY = "littlemo.user";

export type SessionUser = {
  id: string;
  nickname: string | null;
  avatar: string | null;
};

export function getToken() {
  return Taro.getStorageSync(TOKEN_KEY) as string;
}

export function getUser() {
  return (Taro.getStorageSync(USER_KEY) as SessionUser) || null;
}

export function saveSession(token: string, user: SessionUser) {
  Taro.setStorageSync(TOKEN_KEY, token);
  Taro.setStorageSync(USER_KEY, user);
}

export function saveUser(user: SessionUser) {
  Taro.setStorageSync(USER_KEY, user);
}

export function clearSession() {
  Taro.removeStorageSync(TOKEN_KEY);
  Taro.removeStorageSync(USER_KEY);
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function goLogin() {
  Taro.navigateTo({ url: "/pages/login/index" });
}

export async function requireLogin(message = "登录后才能把这一刻记到你的账号里。") {
  if (isLoggedIn()) return true;
  const res = await Taro.showModal({
    title: "先登录",
    content: message,
    confirmText: "去登录",
    cancelText: "先看看",
    confirmColor: "#5f6f52",
  });
  if (res.confirm) goLogin();
  return false;
}
