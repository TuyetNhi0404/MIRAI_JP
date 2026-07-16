import ReactDOM from "react-dom/client";
import { ConfigProvider, App as AntApp } from "antd";
import viVN from "antd/locale/vi_VN";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import { setStore } from "./redux/storeRef";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { antdThemeConfig, brandColors } from "./theme/theme";
import { globalStyles } from "./theme/animations";
import "./styles/globals.css";
import "./styles/mira-motion.css";
import AppRouter from "./AppRouter";

setStore(store);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <ConfigProvider locale={viVN} theme={antdThemeConfig}>
      <AntApp>
        <style>{globalStyles}</style>
        <div
          style={{
            minHeight: "100vh",
            background: brandColors.bg,
            color: brandColors.textPrimary,
          }}
        >
          <Provider store={store}>
            <AppRouter />
          </Provider>
        </div>
      </AntApp>
    </ConfigProvider>
  </GoogleOAuthProvider>
);
