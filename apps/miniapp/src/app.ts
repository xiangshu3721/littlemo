import { PropsWithChildren } from "react";
import { useLaunch } from "@tarojs/taro";
import { applyChrome, readStoredPreference, resolveTheme } from "./utils/theme";
import "./app.scss";

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    applyChrome(resolveTheme(readStoredPreference()));
  });
  return children;
}

export default App;
