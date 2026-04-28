import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Store from "./pages/Store";
import AllProducts from "./pages/AllProducts";
import MyOrders from "./pages/MyOrders";
import ProductDetail from "./pages/ProductDetail";
import Auth from "./pages/Auth";
import PaymentCallback from "./pages/PaymentCallback";
import ResetPassword from "./pages/ResetPassword";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Store />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/payment/callback" element={<PaymentCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/products" element={<AllProducts />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route path="/:slug" element={<ProductDetail />} />
        
        {/* Support legacy /store prefix if needed, or redirect */}
        <Route path="/store" element={<Store />} />
        <Route path="/store/auth" element={<Auth />} />
        <Route path="/store/payment/callback" element={<PaymentCallback />} />
        <Route path="/store/reset-password" element={<ResetPassword />} />
        <Route path="/store/products" element={<AllProducts />} />
        <Route path="/store/orders" element={<MyOrders />} />
        <Route path="/store/:slug" element={<ProductDetail />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </>
  );
}

export default App;
