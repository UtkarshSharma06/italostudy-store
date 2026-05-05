import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Package, ShoppingBag, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import StoreHeader from '@/components/store/StoreHeader';
import StoreFooter from '@/components/store/StoreFooter';
import CartOverlay from '@/components/store/CartOverlay';
import { useCurrency } from '@/hooks/useCurrencyContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Wishlist() {
    const navigate = useNavigate();
    const { user, session } = useAuth() as any;
    const { formatPrice } = useCurrency();
    
    const [wishlist, setWishlist] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);

    const refreshCartCount = () => {
        try {
            const cart = JSON.parse(localStorage.getItem('italostudy_cart') || '[]');
            setCartCount(cart.reduce((s: number, i: any) => s + i.quantity, 0));
        } catch {
            setCartCount(0);
        }
    };

    const loadWishlist = () => {
        try {
            setWishlist(JSON.parse(localStorage.getItem('italostudy_wishlist') || '[]'));
        } catch {
            setWishlist([]);
        }
    };

    useEffect(() => {
        refreshCartCount();
        loadWishlist();
        window.addEventListener('cart-updated', refreshCartCount);
        window.addEventListener('wishlist-updated', loadWishlist);
        return () => {
            window.removeEventListener('cart-updated', refreshCartCount);
            window.removeEventListener('wishlist-updated', loadWishlist);
        };
    }, []);

    const removeFromWishlist = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const updated = wishlist.filter(item => item.id !== id);
        localStorage.setItem('italostudy_wishlist', JSON.stringify(updated));
        setWishlist(updated);
        window.dispatchEvent(new Event('wishlist-updated'));
        toast.success('Removed from wishlist');
    };

    return (
        <div className="min-h-screen bg-[#f5f5f5] dark:bg-slate-950 font-sans flex flex-col">
            <StoreHeader 
                user={user} 
                session={session} 
                cartCount={cartCount} 
                isCartOpen={isCartOpen} 
                setIsCartOpen={setIsCartOpen} 
                navigate={navigate} 
            />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 md:py-12">
                <div className="flex items-center gap-3 mb-8 md:mb-12">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                        <Heart className="w-6 h-6 fill-rose-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">My Wishlist</h1>
                        <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 mt-1">
                            {wishlist.length} {wishlist.length === 1 ? 'Item' : 'Items'} Saved
                        </p>
                    </div>
                </div>

                {wishlist.length === 0 ? (
                    <div className="py-20 text-center space-y-5 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                        <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 mx-auto flex items-center justify-center text-slate-300">
                            <Heart className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Your wishlist is empty</h3>
                            <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
                                Save items you love by clicking the heart icon on any product.
                            </p>
                        </div>
                        <Link to="/products" className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-[#0f172a] text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors">
                            <ShoppingBag className="w-4 h-4" /> Start Shopping
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {wishlist.map(product => (
                            <div
                                key={product.id}
                                onClick={() => navigate(`/${product.slug}`)}
                                className="group bg-white rounded-xl border border-slate-100 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/70 hover:-translate-y-0.5 flex flex-col w-full"
                            >
                                <div className="relative bg-slate-50 overflow-hidden h-44">
                                    <img
                                        src={product.image || `https://placehold.co/400x300/f8fafc/0f172a?text=${encodeURIComponent(product.title.slice(0, 10))}`}
                                        alt={product.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    {product.type === 'digital' && (
                                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-[#0f172a] text-white text-[9px] font-black uppercase">
                                            Digital
                                        </span>
                                    )}
                                    <button
                                        onClick={(e) => removeFromWishlist(product.id, e)}
                                        className="absolute top-2 right-2 md:top-2.5 md:right-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-rose-500 hover:bg-white transition-all shadow-sm z-10"
                                    >
                                        <Heart className="w-3.5 h-3.5 fill-rose-500" />
                                    </button>
                                </div>

                                <div className="p-2 md:p-3 flex flex-col flex-1 gap-1.5 md:gap-2 text-center md:text-left">
                                    <h3 className="font-bold md:font-semibold text-slate-800 leading-tight md:leading-snug line-clamp-1 md:line-clamp-2 group-hover:text-[#0f172a] transition-colors text-[11px] md:text-sm">
                                        {product.title}
                                    </h3>
                                    <div className="flex items-baseline justify-center md:justify-start mt-auto">
                                        <span className="font-black text-[#0f172a] text-sm md:text-base">
                                            {formatPrice(product.price)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <StoreFooter />
            <CartOverlay isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </div>
    );
}
