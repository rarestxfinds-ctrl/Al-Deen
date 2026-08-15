import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./Index.css";
import { registerSW } from "./Register-Service-Worker";

createRoot(document.getElementById("root")!).render(<App />);
registerSW();
