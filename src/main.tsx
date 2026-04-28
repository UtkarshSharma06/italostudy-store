import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./lib/auth.tsx";
import { CurrencyProvider } from "./hooks/useCurrencyContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
        <AuthProvider>
            <CurrencyProvider>
                <App />
            </CurrencyProvider>
        </AuthProvider>
    </BrowserRouter>
);
