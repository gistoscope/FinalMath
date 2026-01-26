import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ViewerProvider } from "./context/ViewerContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ViewerProvider>
      <App />
    </ViewerProvider>
  </StrictMode>,
);
