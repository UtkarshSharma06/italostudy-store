import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, CheckCircle2 } from 'lucide-react';

interface Purchase {
    id: number;
    name: string;
    city: string;
    productName: string;
    timeAgo: string;
}

const NAMES = ['Luca', 'Giulia', 'Marco', 'Elena', 'Alessio', 'Sofia', 'Matteo', 'Chiara', 'Davide', 'Francesca', 'Pietro', 'Sara'];
const CITIES = ['Rome', 'Milan', 'Naples', 'Turin', 'Bologna', 'Florence', 'Bari', 'Catania', 'Venice', 'Verona', 'Messina', 'Padua'];

export default function SocialProofToasts({ products }: { products: any[] }) {
    const [currentPurchase, setCurrentPurchase] = useState<Purchase | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (products.length === 0) return;

        const showToast = () => {
            const name = NAMES[Math.floor(Math.random() * NAMES.length)];
            const city = CITIES[Math.floor(Math.random() * CITIES.length)];
            const product = products[Math.floor(Math.random() * products.length)];
            const minutes = Math.floor(Math.random() * 55) + 5;

            setCurrentPurchase({
                id: Date.now(),
                name,
                city,
                productName: product.title,
                timeAgo: `${minutes} minutes ago`
            });
            setIsVisible(true);

            // Hide after 5 seconds
            setTimeout(() => {
                setIsVisible(false);
            }, 5000);
        };

        // First toast after 8 seconds
        const initialTimer = setTimeout(showToast, 8000);

        // Subsequent toasts every 15-30 seconds
        const interval = setInterval(() => {
            showToast();
        }, Math.random() * 15000 + 15000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, [products]);

    return (
        <div className="fixed bottom-20 md:bottom-8 left-4 md:left-8 z-[60] pointer-events-none">
            <AnimatePresence>
                {isVisible && currentPurchase && (
                    <motion.div
                        initial={{ opacity: 0, x: -20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.9 }}
                        className="pointer-events-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-800 p-3 md:p-4 flex items-center gap-3 md:gap-4 max-w-[280px] md:max-w-xs"
                    >
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                            <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1 mb-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Recent Purchase
                            </p>
                            <p className="text-[11px] md:text-xs text-slate-900 dark:text-white font-bold leading-tight">
                                {currentPurchase.name} from {currentPurchase.city}
                            </p>
                            <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-0.5">
                                bought {currentPurchase.productName}
                            </p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-tighter">
                                {currentPurchase.timeAgo}
                            </p>
                        </div>
                        <button 
                            onClick={() => setIsVisible(false)}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-300 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
