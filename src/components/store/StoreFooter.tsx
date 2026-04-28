import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export default function StoreFooter() {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-16 mt-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col items-center text-center">
                    <div className="flex items-center gap-3 mb-8">
                        <img src="/logo.webp" alt="Italostudy" className="h-8 opacity-90" />
                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Store</span>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-8 mb-10">
                        <button onClick={() => navigate('/')} className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">Home</button>
                        <button onClick={() => navigate('/products')} className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">All Products</button>
                        {user && <button onClick={() => navigate('/my-orders')} className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">My Orders</button>}
                        <a href="https://italostudy.com" className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">Italostudy Platform</a>
                    </div>

                    <div className="w-full max-w-4xl h-px bg-slate-200 dark:bg-slate-800 mb-10" />

                    <div className="flex flex-col md:flex-row items-center justify-between w-full gap-8">
                        <div className="text-center md:text-left order-2 md:order-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                &copy; {new Date().getFullYear()} ItaloStudy Education Technologies. All rights reserved.
                            </p>
                        </div>

                        {/* Payment Logos */}
                        <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 order-1 md:order-2">
                            {['visa', 'mastercard', 'amex', 'paypal', 'applepay', 'googlepay', 'ideal', 'pix', 'upi', 'cashapp'].map(logo => (
                                <img 
                                    key={logo}
                                    src={`/payments/${logo}.webp`} 
                                    alt={logo} 
                                    className="h-5 md:h-6 w-auto object-contain transition-all hover:scale-110 drop-shadow-sm"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
