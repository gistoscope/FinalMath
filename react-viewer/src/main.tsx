import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "reflect-metadata";
import App from "./App.tsx";
import "./index.css";
import { setupDIContainer } from "./new_app/di/container";

// Initialize Dependency Injection
setupDIContainer();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
