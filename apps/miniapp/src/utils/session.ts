import Taro from "@tarojs/taro";

const TOKEN_KEY = "suisuinian.token";
const USER_KEY = "suisuinian.user";

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

export function clearSession() {
  Taro.removeStorageSync(TOKEN_KEY);
  Taro.removeStorageSync(USER_KEY);
}

export function isLoggedIn() {
  return Boolean(getToken());
}
