import ReactDOM from "react-dom/client";
import AppRouter from "./AppRouter";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import { setStore } from "./redux/storeRef";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "bootstrap/dist/css/bootstrap.min.css";

setStore(store);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <Provider store={store}>
      <AppRouter />
    </Provider>
  </GoogleOAuthProvider>
);
