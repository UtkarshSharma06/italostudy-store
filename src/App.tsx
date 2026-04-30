import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Store from "./pages/Store";
import AllProducts from "./pages/AllProducts";
import MyOrders from "./pages/MyOrders";
import ProductDetail from "./pages/ProductDetail";
import Auth from "./pages/Auth";
import PaymentCallback from "./pages/PaymentCallback";
import ResetPassword from "./pages/ResetPassword";

import { useState, useEffect } from "react";
import { supabase } from "./integrations/supabase/client";
import { Loader2, ShoppingBag, Clock } from "lucide-react";

function MaintenanceScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(99,102,241,0.05),_transparent_70%)] pointer-events-none" />
        
        <div className="relative z-10 max-w-md w-full space-y-8">
            <div className="flex justify-center">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-xl">
                    <ShoppingBag className="w-10 h-10 text-white" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                    <Clock className="w-3 h-3" />
                    Market Offline
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight uppercase leading-none">
                    Launching <span className="text-indigo-400">Soon</span>
                </h1>
                <p className="text-slate-400 text-sm font-medium leading-relaxed px-4">
                    We're currently updating the Italostudy Store with new resources. We'll be back online shortly.
                </p>
            </div>

            <div className="pt-8 border-t border-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                    Italostudy Protocol v4.0
                </p>
            </div>
        </div>
    </div>
  );
}

function App() {
  const [isMaintenance, setIsMaintenance] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkMaintenance() {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'store_config')
          .maybeSingle();
        
        const config = data?.value as any;
        if (config?.maintenance_mode) {
          setIsMaintenance(true);
        } else {
          setIsMaintenance(false);
        }
      } catch (e) {
        setIsMaintenance(false);
      }
    }
    checkMaintenance();
  }, []);

  if (isMaintenance === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-white opacity-20" />
      </div>
    );
  }

  if (isMaintenance) {
    return <MaintenanceScreen />;
  }

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
