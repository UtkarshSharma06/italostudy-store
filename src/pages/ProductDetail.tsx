import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
    ShoppingBag, Check, ShieldCheck, CheckCircle2,
    ChevronRight, ChevronDown, Zap,
    Pencil, Image as ImageIcon,
    Share2, X, Download, Star
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import CartOverlay from '@/components/store/CartOverlay';
import SocialProofToasts from '@/components/store/SocialProofToasts';
import { StoreDetailSkeleton } from '@/components/SkeletonLoader';
import StoreFooter from '@/components/store/StoreFooter';
import StoreHeader from '@/components/store/StoreHeader';
import { useCurrency } from '@/hooks/useCurrencyContext';
import SEOHead from '@/components/SEOHead';

const JSONLDSchema = ({ product, reviews, avgRating }: { product: Product, reviews: any[], avgRating: string | null }) => {
    const schema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.title,
        "image": product.images,
        "description": product.seo_description || product.description?.replace(/<[^>]*>?/gm, '').slice(0, 160),
        "sku": product.id,
        "brand": {
            "@type": "Brand",
            "name": "Italostudy"
        },
        ...(avgRating && {
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": avgRating,
                "bestRating": "5",
                "ratingCount": reviews.length || 1,
                "reviewCount": reviews.length || 1
            }
        }),
        ...(reviews.length > 0 && {
            "review": reviews.slice(0, 10).map(r => ({
                "@type": "Review",
                "reviewRating": {
                    "@type": "Rating",
                    "ratingValue": r.rating,
                    "bestRating": "5"
                },
                "author": {
                    "@type": "Person",
                    "name": r.user_name || "Verified Student"
                },
                "reviewBody": r.body,
                "datePublished": r.created_at
            }))
        }),
        "offers": {
            "@type": "Offer",
            "url": typeof window !== 'undefined' ? window.location.href : '',
            "priceCurrency": "EUR",
            "price": product.price,
            "availability": "https://schema.org/InStock"
        }
    };

    return (
        <script type="application/ld+json">
            {JSON.stringify(schema)}
        </script>
    );
};

interface Product {
    id: string;
    title: string;
    slug: string;
    description: string;
    price: number;
    discount_price: number | null;
    type: 'digital' | 'physical';
    images: string[];
    category_id: string | null;
    is_bundle?: boolean;
    bundle_items?: string[];
    whats_included?: string[];
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string[];
    faqs?: { question: string; answer: string }[];
    canonical_url?: string;
    sale_ends_at?: string | null;
    sample_url?: string | null;
    stock_quantity?: number;
}

function getCart() {
    try { return JSON.parse(localStorage.getItem('italostudy_cart') || '[]'); } catch { return []; }
}

export default function ProductDetail({ isMobileView: _isMobileView = false }: { isMobileView?: boolean }) {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user, session, syncCart } = useAuth() as any;
    const { formatPrice } = useCurrency();

    const [product,      setProduct]      = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [isLoading,    setIsLoading]    = useState(true);
    const [isCartOpen,   setIsCartOpen]   = useState(false);
    const [activeImage,  setActiveImage]  = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [addedToCart,  setAddedToCart]  = useState(false);
    const [cartCount,    setCartCount]    = useState(0);
    const [visibleReviews, setVisibleReviews] = useState(5);
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' });
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });

    // Timer logic
    useEffect(() => {
        if (!product || !product.sale_ends_at) return;
        const endTime = new Date(product.sale_ends_at).getTime();

        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = endTime - now;

            if (distance < 0) {
                setTimeLeft(null);
            } else {
                setTimeLeft({
                    d: Math.floor(distance / (1000 * 60 * 60 * 24)),
                    h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                    s: Math.floor((distance % (1000 * 60)) / 1000),
                });
            }
        };
        
        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [product]);

    const refreshCartCount = useCallback(() => {
        setCartCount(getCart().reduce((s: number, i: any) => s + i.quantity, 0));
    }, []);
    useEffect(() => {
        refreshCartCount();
        window.addEventListener('cart-updated', refreshCartCount);
        return () => window.removeEventListener('cart-updated', refreshCartCount);
    }, [refreshCartCount]);

    useEffect(() => { fetchProduct(); }, [slug]);



    const fetchProduct = async () => {
        setIsLoading(true);
        const { data, error } = await (supabase
            .from('store_products' as any) as any)
            .select('*')
            .eq('slug', slug)
            .single();
        if (error) navigate('/');
        else {
            setProduct(data as any);
            if (data.category_id) {
                const { data: related } = await (supabase
                    .from('store_products' as any) as any)
                    .select('*')
                    .eq('category_id', data.category_id)
                    .neq('id', data.id)
                    .eq('is_active', true)
                    .limit(4);
                if (related) setRelatedProducts(related as any);
            }
            
            // Add to recently viewed
            const viewed = JSON.parse(localStorage.getItem('italostudy_recently_viewed') || '[]');
            const updatedViewed = [data.id, ...viewed.filter((id: string) => id !== data.id)].slice(0, 6);
            localStorage.setItem('italostudy_recently_viewed', JSON.stringify(updatedViewed));
        }
        setIsLoading(false);
        window.scrollTo(0, 0);
        fetchReviews();
    };

    const fetchReviews = async () => {
        if (!slug) return;
        
        // First get the product ID since we only have slug
        const { data: p } = await (supabase.from('store_products' as any) as any).select('id').eq('slug', slug).single();
        if (!p) return;

        const { data: allReviews } = await (supabase.from('store_reviews' as any) as any).select('id, is_approved').eq('product_id', p.id);
        const hiddenCount = allReviews?.filter((r: any) => !r.is_approved).length || 0;
        if (hiddenCount > 0) {
            console.log(`Found ${hiddenCount} reviews for this product that are pending approval.`);
        }

        const { data } = await (supabase
            .from('store_reviews' as any) as any)
            .select('*')
            .eq('product_id', p.id)
            .eq('is_approved', true)
            .order('created_at', { ascending: false });
        
        if (data) setReviews(data);
    };



    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !product) return;

        setIsSubmittingReview(true);
        try {
            const { error } = await (supabase
                .from('store_reviews' as any) as any)
                .insert({
                    product_id: product.id,
                    user_id: user.id,
                    user_name: user.user_metadata?.full_name || 'Student',
                    rating: reviewForm.rating,
                    title: reviewForm.title,
                    body: reviewForm.body,
                    is_approved: false // Requires moderation
                });

            if (error) throw error;
            toast.success('Review submitted! It will appear once approved by an admin.');
            setShowReviewForm(false);
            setReviewForm({ rating: 5, title: '', body: '' });
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const avgRating = reviews.length > 0 
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: product?.title,
                    text: product?.seo_description || product?.description,
                    url: window.location.href,
                });
            } catch (err) {
                console.log(err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied to clipboard!');
        }
    };



    const handleAddToCart = () => {
        if (!product) return;
        
        const maxStock = product.stock_quantity ?? 999;
        
        if (maxStock < 1) {
            toast.error('Product is out of stock');
            return;
        }

        const cart = getCart();
        const existing = cart.find((i: any) => i.id === product.id);
        const updated = [...cart];
        
        if (existing) {
            const idx = updated.findIndex((i: any) => i.id === product.id);
            if (updated[idx].quantity >= maxStock) {
                toast.error(`Only ${maxStock} in stock available`);
                return;
            }
            updated[idx].quantity += 1;
        } else {
            updated.push({ 
                id: product.id, 
                title: product.title, 
                price: product.price, 
                image: product.images?.[0] || '', 
                quantity: 1, 
                type: product.type 
            });
        }

        if (user) {
            syncCart(updated);
        } else {
            localStorage.setItem('italostudy_cart', JSON.stringify(updated));
            window.dispatchEvent(new Event('cart-updated'));
        }

        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
    };

    const discountPct = product?.discount_price && product.price < product.discount_price
        ? Math.round((1 - product.price / product.discount_price) * 100) : null;

    // ── Loading skeleton ──────────────────────────────────
    if (isLoading) return (
        <div className="min-h-screen bg-[#f7f8fa] flex flex-col">
            <StoreHeader user={user} session={session} cartCount={cartCount} isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} navigate={navigate} />
            <StoreDetailSkeleton />
            <StoreFooter />
        </div>
    );

    if (!product) return null;

    return (
        <div className="min-h-screen bg-[#f7f8fa] flex flex-col font-sans">
            <SEOHead 
                title={product.seo_title || (product.title.includes('CENT-S') || product.title.includes('IMAT') ? `${product.title} | Prep Book & Mock Tests` : product.title)}
                description={product.seo_description || product.description?.slice(0, 160) || `Buy the official ${product.title} at Italostudy Store. The most trusted resource for ${product.title} preparation with mock tests and PDF guides.`}
                image={product.images?.[0]}
                type="product"
                canonicalUrl={product.canonical_url}
                keywords={[
                    ...(product.seo_keywords || []),
                    product.title, 
                    'cent-s exam preparation book pdf', 
                    'cents mock test', 
                    'imat 2026 syllabus', 
                    'italostudy store'
                ]}
                faqs={product.faqs && product.faqs.length > 0 ? product.faqs : [
                    {
                        question: `Is the ${product.title} updated for 2026?`,
                        answer: "Yes, all Italostudy resources are meticulously updated to align with the most recent official exam regulations and syllabi."
                    },
                    {
                        question: "How long do I have access to digital downloads?",
                        answer: "To prevent piracy, download links are valid for 1 hour after generation, but you can always generate a new link from your dashboard at any time."
                    }
                ]}
                productData={{
                    name: product.title,
                    description: product.seo_description || product.description || `Premium ${product.type} study resource for ${product.title}.`,
                    image: product.images?.[0] || '',
                    price: product.price,
                    currency: 'EUR',
                    availability: 'in_stock'
                }}
            />
            <JSONLDSchema product={product} reviews={reviews} avgRating={avgRating} />
            <StoreHeader user={user} session={session} cartCount={cartCount} isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} navigate={navigate} />

            {/* Breadcrumb & Share */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-12 text-[12px] font-medium">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Link to="/" className="hover:text-slate-900 transition-colors">Store</Link>
                        <ChevronRight className="w-3 h-3" />
                        <Link to="/products" className="hover:text-slate-900 transition-colors">UG Entrance Exams</Link>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-slate-900 font-bold truncate max-w-[200px]">{product.title}</span>
                    </div>
                    <button onClick={handleShare} className="flex items-center gap-2 text-slate-900 font-bold hover:text-indigo-600 transition-all">
                        <Share2 className="w-4 h-4" />
                        Share
                    </button>
                </div>
            </div>

            {/* ── Main product layout ──────────────────────────── */}
            <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 md:py-12">
                <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">

                    {/* ── Left: Image Gallery (Fixed/Sticky & Compact) ──────── */}
                    <div className="w-full lg:w-[45%] lg:sticky lg:top-28 lg:self-start space-y-4">
                        <div className="hidden lg:flex gap-4">
                            {/* Vertical Thumbnails (Desktop Only) */}
                            {product.images && product.images.length > 1 && (
                                <div className="hidden lg:flex flex-col gap-2 w-16 shrink-0 max-h-[70vh] overflow-y-auto scrollbar-none">
                                    {product.images.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveImage(idx)}
                                            className={cn(
                                                "w-full aspect-square rounded-lg border-2 overflow-hidden transition-all duration-300",
                                                activeImage === idx 
                                                    ? "border-indigo-600" 
                                                    : "border-slate-200 opacity-60 hover:opacity-100"
                                            )}
                                        >
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Main Image Display (Compact) */}
                            <motion.div 
                                    className="flex-1 relative cursor-zoom-in bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm group/zoom"
                                    onMouseMove={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                                        setZoomPos({ x, y });
                                    }}
                                    onMouseEnter={() => setIsHovering(true)}
                                    onMouseLeave={() => setIsHovering(false)}
                                    onClick={() => setIsLightboxOpen(true)}
                                >
                                    <motion.img
                                        layoutId="product-image"
                                        src={product.images?.[activeImage] || '/placeholder.svg'}
                                        alt={product.title}
                                        className="w-full h-full object-cover transition-transform duration-500"
                                        style={{ 
                                            transform: isHovering ? `scale(1.8) translate(${-(zoomPos.x - 50) / 2.5}%, ${-(zoomPos.y - 50) / 2.5}%)` : 'scale(1)',
                                            transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`
                                        }}
                                    />
                                    {product.sample_url && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); window.open(product.sample_url!, '_blank'); }}
                                            className="absolute bottom-3 left-3 bg-white/90 backdrop-blur text-indigo-600 border border-indigo-100 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm hover:bg-white transition-all active:scale-95 text-[10px] font-black uppercase tracking-wider z-20"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Preview Book
                                        </button>
                                    )}
                                </motion.div>
                            </div>
                        </div>

                        {/* Mobile Gallery (Horizontal Snap Scroll - Peeking Effect) */}
                        <div className="lg:hidden relative -mx-4">
                            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3 px-4 pb-2">
                                {product.images?.map((img, idx) => (
                                    <div key={idx} className="min-w-[85%] snap-center aspect-square bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm relative">
                                        <img src={img} alt="" className="w-full h-full object-cover" onClick={() => { setActiveImage(idx); setIsLightboxOpen(true); }} />
                                    </div>
                                ))}
                            </div>
                            
                            {/* Fixed Preview Button for Mobile */}
                            {product.sample_url && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); window.open(product.sample_url!, '_blank'); }}
                                    className="absolute bottom-6 left-8 bg-white/95 backdrop-blur text-indigo-600 border border-indigo-100 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-xl shadow-indigo-500/10 text-[10px] font-black uppercase tracking-wider z-20 active:scale-95 transition-all"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Preview Book
                                </button>
                            )}

                            {/* Counter for mobile */}
                            {product.images?.length > 1 && (
                                <div className="absolute top-2 right-6 bg-white/80 backdrop-blur-md text-slate-900 border border-slate-100 text-[9px] font-black px-2.5 py-1 rounded-full shadow-sm">
                                    {activeImage + 1} / {product.images.length}
                                </div>
                            )}
                        </div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full lg:w-[50%] space-y-6"
                    >
                        <div className="space-y-6">
                            {/* High-Attention Duolingo-Style Flash Sale */}
                            {timeLeft && (
                                <div className="bg-[#FFF5F5] border-2 border-[#FFD6D6] border-b-4 rounded-2xl p-3 md:p-4 flex flex-row items-center justify-between gap-4 shadow-sm relative overflow-hidden group/sale">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-[#FF4B4B] border-2 border-[#D33131] border-b-4 rounded-xl flex items-center justify-center shrink-0 -rotate-3 group-hover/sale:rotate-0 transition-all duration-300">
                                            <Zap className="w-5 h-5 text-white fill-white animate-pulse" />
                                        </div>
                                        <div>
                                            <h3 className="text-[10px] font-black text-[#FF4B4B] uppercase tracking-wider leading-none">Flash Sale!</h3>
                                            <p className="text-slate-900 text-xs font-black uppercase tracking-tight mt-1">Limited Student Offer</p>
                                        </div>
                                    </div>

                                    {/* Playful Compact Timer with Attention Colors */}
                                    <div className="flex items-center gap-2">
                                        {[
                                            { label: 'd', value: timeLeft.d },
                                            { label: 'h', value: timeLeft.h },
                                            { label: 'm', value: timeLeft.m },
                                            { label: 's', value: timeLeft.s }
                                        ].map((unit, i) => (
                                            <div key={i} className="flex items-center">
                                                <div className="bg-white border-2 border-[#FFD6D6] border-b-4 rounded-lg px-2 py-1 flex items-center justify-center min-w-[32px] group-hover/sale:border-[#FF4B4B] transition-colors">
                                                    <AnimatePresence mode="wait">
                                                        <motion.span
                                                            key={unit.value}
                                                            initial={{ y: 5, opacity: 0 }}
                                                            animate={{ y: 0, opacity: 1 }}
                                                            exit={{ y: -5, opacity: 0 }}
                                                            className="text-sm font-black text-[#FF4B4B] tabular-nums"
                                                        >
                                                            {unit.value.toString().padStart(2, '0')}
                                                        </motion.span>
                                                    </AnimatePresence>
                                                </div>
                                                <span className="text-[8px] font-black text-slate-400 uppercase ml-1">{unit.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-black text-[#0f172a] leading-tight tracking-tight">{product.title}</h1>
                                    <p className="text-sm text-slate-500 mt-1 font-medium">Official Italostudy Resource</p>
                                    <div className="flex flex-wrap items-center gap-4 mt-3">
                                        {avgRating && (
                                            <div className="flex items-center gap-2">
                                                <div className="bg-emerald-600 text-white rounded px-2 py-0.5 flex items-center gap-1 text-sm font-bold shadow-sm">
                                                    {avgRating} <Star className="w-3 h-3 fill-current" />
                                                </div>
                                                <span className="text-sm text-slate-500 font-medium">{reviews.length} Verified Reviews</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center gap-4">
                                        <span className="text-3xl md:text-4xl font-black text-[#0f172a] tracking-tight">{formatPrice(product.price)}</span>
                                        {product.discount_price && (
                                            <>
                                                <span className="text-lg text-slate-400 line-through font-bold">{formatPrice(product.discount_price)}</span>
                                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-black uppercase">{discountPct}% OFF</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full animate-pulse", 
                                            (product.stock_quantity !== undefined && product.stock_quantity === 0) ? "bg-slate-400" :
                                            (product.stock_quantity !== undefined && product.stock_quantity > 0 && product.stock_quantity <= 3) ? "bg-rose-500" : "bg-emerald-500")} />
                                        {product.stock_quantity !== undefined && product.stock_quantity === 0 ? (
                                            <p className="text-sm font-black text-slate-500 uppercase tracking-widest">
                                                Out of Stock
                                            </p>
                                        ) : product.stock_quantity !== undefined && product.stock_quantity > 0 && product.stock_quantity <= 3 ? (
                                            <p className="text-sm font-black text-rose-600 uppercase tracking-widest animate-bounce-subtle">
                                                Hurry up! only {product.stock_quantity} in stock left
                                            </p>
                                        ) : (
                                            <p className="text-sm font-black text-emerald-600 uppercase tracking-widest">
                                                In Stock & Ready to Ship
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4">
                                    {product.sample_url && (
                                        <button onClick={() => window.open(product.sample_url!, '_blank')} className="w-full h-11 md:h-12 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                                            <Download className="w-4 h-4" /> Download Free Sample
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleAddToCart} 
                                        disabled={product.stock_quantity === 0}
                                        className={cn("w-full h-12 md:h-14 rounded-xl font-black uppercase tracking-widest text-xs md:text-sm transition-all flex items-center justify-center gap-3 active:scale-[0.98]", 
                                            product.stock_quantity === 0 ? "bg-slate-200 text-slate-400 cursor-not-allowed" :
                                            addedToCart ? "bg-emerald-500 text-white" : "bg-[#0f172a] hover:bg-slate-800 text-white shadow-xl shadow-slate-200")}>
                                        {product.stock_quantity === 0 ? 'Out of Stock' : addedToCart ? <><Check className="w-5 h-5" /> Added!</> : <><ShoppingBag className="w-5 h-5" /> Add to Cart</>}
                                    </button>
                                    <button 
                                        onClick={() => { handleAddToCart(); setIsCartOpen(true); }} 
                                        disabled={product.stock_quantity === 0}
                                        className={cn("w-full h-11 md:h-12 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs border-2 transition-all",
                                            product.stock_quantity === 0 ? "border-slate-200 text-slate-300 cursor-not-allowed" :
                                            "border-[#0f172a] text-[#0f172a] hover:bg-[#0f172a] hover:text-white")}>
                                        Buy Now →
                                    </button>
                                    <p className="text-center text-[9px] md:text-[10px] text-slate-400 font-medium">🔒 Secure checkout · SSL encrypted · Stripe payments</p>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">About this product</p>
                                <p className="text-slate-600 leading-relaxed font-medium text-sm">{product.description || 'Premium Italostudy resource.'}</p>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">What's included</p>
                                <div className="space-y-2.5">
                                    {(product.whats_included && product.whats_included.length > 0 ? product.whats_included : ['Instant access after checkout', 'Detailed explanations', 'Practice questions', 'Aligned to syllabus']).map((item, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3 text-emerald-500" /></div>
                                            <span className="text-sm text-slate-600 font-medium">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {product.type === 'digital' && (
                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-[#0f172a]" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a]">Secure Digital Access</p>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">Digital products are non-refundable once accessed.</p>
                                </div>
                            )}

                            {/* FAQ Section - NEW */}
                            {product.faqs && product.faqs.length > 0 && (
                                <div className="pt-12 border-t border-slate-100 space-y-6">
                                    <div className="space-y-2">
                                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                                            Got Questions?
                                        </div>
                                        <h3 className="text-3xl font-black text-[#0f172a] tracking-tight">Frequently Asked Questions</h3>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {product.faqs.map((faq, idx) => (
                                            <div key={idx} className="bg-white rounded-2xl border border-slate-100 overflow-hidden transition-all">
                                                <button 
                                                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                                    className="w-full px-6 py-5 flex items-center justify-between text-left group"
                                                >
                                                    <span className="text-sm font-black text-[#0f172a] group-hover:text-indigo-600 transition-colors">{faq.question}</span>
                                                    <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300", openFaq === idx && "rotate-180 text-indigo-600")} />
                                                </button>
                                                <AnimatePresence>
                                                    {openFaq === idx && (
                                                        <motion.div 
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.3 }}
                                                        >
                                                            <div className="px-6 pb-6 text-sm text-slate-500 font-medium leading-relaxed border-t border-slate-50 pt-4">
                                                                {faq.answer}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reviews Section - PREMIUM OVERHAUL */}
                            <div className="pt-12 border-t border-slate-100 space-y-10">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-3">
                                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                                            <ShieldCheck className="w-3 h-3" /> 100% Verified Reviews
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                            <h3 className="text-3xl font-black text-[#0f172a] tracking-tight">Rating & Reviews</h3>
                                            {!showReviewForm && (
                                                <button 
                                                    onClick={() => { if (!user) navigate('/login'); else setShowReviewForm(true); }} 
                                                    className="w-fit inline-flex items-center gap-2 px-4 py-2.5 bg-[#0f172a] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" /> Write Review
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {avgRating && (
                                        <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-6 shadow-xl shadow-slate-100/50 flex items-center gap-6 min-w-[280px]">
                                            <div className="text-center">
                                                <div className="text-3xl font-black text-[#0f172a] leading-none mb-1">{avgRating}</div>
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Out of 5</div>
                                            </div>
                                            <div className="h-10 w-px bg-slate-100" />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-1 mb-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star key={star} className={cn("w-3.5 h-3.5", star <= Math.round(Number(avgRating)) ? "text-amber-400 fill-amber-400" : "text-slate-100")} />
                                                    ))}
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Based on {reviews.length} reviews</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Review Form Modal-like Inline */}
                                <AnimatePresence>
                                    {showReviewForm && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }} 
                                            animate={{ opacity: 1, height: "auto" }} 
                                            exit={{ opacity: 0, height: 0 }} 
                                            className="overflow-hidden"
                                        >
                                            <div className="bg-white rounded-[2rem] p-6 md:p-10 border-2 border-indigo-600 shadow-2xl space-y-6 mb-10">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h4 className="text-xl font-black text-[#0f172a] tracking-tight">Share Your Experience</h4>
                                                        <p className="text-xs text-slate-500 font-medium">Your feedback helps thousands of other students.</p>
                                                    </div>
                                                    <button onClick={() => setShowReviewForm(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rate your experience</label>
                                                            <div className="flex gap-2">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <button key={star} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: star })} className="transition-transform active:scale-90">
                                                                        <Star className={cn("w-10 h-10", star <= reviewForm.rating ? "text-amber-400 fill-amber-400" : "text-slate-100")} />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Review Title</label>
                                                            <input required placeholder="Briefly summarize your experience" className="w-full h-12 px-5 rounded-2xl bg-slate-50 border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={reviewForm.title} onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Review Details</label>
                                                        <textarea required placeholder="What did you like? How did it help you?" className="w-full h-40 p-5 rounded-2xl bg-slate-50 border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none" value={reviewForm.body} onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })} />
                                                    </div>
                                                </div>

                                                <div className="flex justify-end">
                                                    <button onClick={handleSubmitReview} disabled={isSubmittingReview} className="h-12 px-10 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-indigo-100">
                                                        {isSubmittingReview ? 'Posting Review...' : 'Submit Review →'}
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* DESKTOP REVIEWS GRID */}
                                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                                    {reviews.length === 0 ? (
                                        <div className="col-span-2 py-20 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                                <Star className="w-8 h-8 text-slate-200" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No reviews yet. Be the first to share your success!</p>
                                        </div>
                                    ) : (
                                        <>
                                            {reviews.slice(0, visibleReviews).map((r, i) => (
                                                <motion.div 
                                                    key={i} 
                                                    initial={{ opacity: 0, y: 10 }} 
                                                    animate={{ opacity: 1, y: 0 }} 
                                                    transition={{ delay: i * 0.05 }} 
                                                    className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 hover:border-indigo-100 transition-all"
                                                >
                                                    <div className="space-y-3 mb-4">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="flex gap-0.5 shrink-0">
                                                                {[...Array(5)].map((_, idx) => (
                                                                    <Star key={idx} className={cn("w-4 h-4", idx < r.rating ? "text-amber-400 fill-amber-400" : "text-slate-100")} />
                                                                ))}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                                {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-base font-black text-[#0f172a] leading-tight">{r.title}</h4>
                                                    </div>
                                                    <div className="text-sm text-slate-600 leading-relaxed font-medium mb-6">
                                                        {r.body}
                                                    </div>
                                                    <div className="pt-4 border-t border-slate-50 flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-[11px] font-black text-indigo-600 border border-indigo-100 shadow-sm shrink-0">
                                                            {r.user_name?.[0] || 'S'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="block text-[11px] font-black text-[#0f172a] uppercase tracking-wide truncate">{r.user_name}</span>
                                                            <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-emerald-600">
                                                                <CheckCircle2 className="w-3 h-3" /> Verified Student
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </>
                                    )}
                                </div>

                                {/* MOBILE REVIEWS FEED (REBUILT FROM SCRATCH) */}
                                <div className="md:hidden space-y-4">
                                    {reviews.length === 0 ? (
                                        <div className="py-12 text-center bg-slate-50/50 rounded-3xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No reviews yet</p>
                                        </div>
                                    ) : (
                                        <>
                                            {reviews.slice(0, visibleReviews).map((r, i) => (
                                                <motion.div 
                                                    key={i} 
                                                    initial={{ opacity: 0, x: -10 }} 
                                                    animate={{ opacity: 1, x: 0 }} 
                                                    className="bg-white rounded-[1.25rem] p-5 border border-slate-100 shadow-sm active:scale-[0.98] transition-transform"
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-indigo-100">
                                                                {r.user_name?.[0] || 'S'}
                                                            </div>
                                                            <div>
                                                                <span className="block text-[10px] font-black text-slate-900 leading-none mb-1">{r.user_name}</span>
                                                                <span className="flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-emerald-600">
                                                                    <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-md">
                                                            {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-1.5 mb-3">
                                                        <div className="flex gap-0.5">
                                                            {[...Array(5)].map((_, idx) => (
                                                                <Star key={idx} className={cn("w-3 h-3", idx < r.rating ? "text-amber-400 fill-amber-400" : "text-slate-100")} />
                                                            ))}
                                                        </div>
                                                        <h4 className="text-sm font-black text-slate-900 leading-tight">{r.title}</h4>
                                                    </div>

                                                    <p className="text-[12px] text-slate-600 font-medium leading-relaxed">
                                                        {r.body}
                                                    </p>
                                                </motion.div>
                                            ))}
                                        </>
                                    )}
                                </div>
                                
                                {visibleReviews < reviews.length && (
                                    <div className="pt-6">
                                        <button 
                                            onClick={() => setVisibleReviews(prev => prev + 6)} 
                                            className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-600 transition-all active:scale-[0.98]"
                                        >
                                            Load More ({reviews.length - visibleReviews})
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>


            </div>

            {/* ── Related Products ────────────────────────────── */}
            {relatedProducts.length > 0 && (
                <div className="max-w-6xl mx-auto w-full px-4 pb-16">
                    <h3 className="text-xl font-black text-[#0f172a] mb-6">You may also like</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x">
                        {relatedProducts.map(p => (
                            <Link key={p.id} to={`/store/${p.slug}`} className="snap-start shrink-0 w-[240px] group bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                                <div className="aspect-square bg-slate-50 relative overflow-hidden">
                                    <img src={p.images?.[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                </div>
                                <div className="p-4 flex flex-col flex-1">
                                    <h4 className="font-black text-sm text-[#0f172a] line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">{p.title}</h4>
                                    <div className="mt-auto flex items-center gap-2">
                                        <span className="font-black text-[#0f172a]">{formatPrice(p.price)}</span>
                                        {p.discount_price && <span className="text-xs text-slate-400 line-through">{formatPrice(p.discount_price)}</span>}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* ── Social proof / bottom strip (Moved here) ─────────────────── */}
                    <div className="mt-16 bg-[#0f172a] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-indigo-500/10">
                        <div className="space-y-2 text-center md:text-left">
                            <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest">Italostudy Promise</p>
                            <h3 className="text-white text-xl md:text-2xl font-black leading-snug">
                                Join 5,000+ students who<br className="hidden md:block" /> trust our resources.
                            </h3>
                            <p className="text-slate-400 text-sm font-medium">
                                92% of students who used our exam kits improved their scores by at least 15 points.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                            <button
                                onClick={handleAddToCart}
                                className="h-12 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95"
                            >
                                <ShoppingBag className="w-4 h-4" /> Get This Resource
                            </button>
                            <Link to="/products"
                                className="h-12 px-6 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-2 active:scale-95">
                                Browse More →
                            </Link>
                        </div>
                    </div>
                </div>
            )}



            {/* ── Image Lightbox (Amazon Style - Clean & Light) ─────────────────── */}
            <AnimatePresence>
                {isLightboxOpen && product && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-[200] bg-white/98 backdrop-blur-xl flex flex-col"
                    >
                        {/* Header Controls */}
                        <div className="flex items-center justify-between p-6 md:p-8 border-b border-slate-100 bg-white/50">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 tracking-tight leading-tight line-clamp-1">{product.title}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gallery View • Image {activeImage + 1} of {product.images.length}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsLightboxOpen(false)}
                                className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-900 hover:bg-slate-100 transition-all active:scale-90 border border-slate-100"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Main Viewing Area */}
                        <div className="flex-1 relative flex items-center justify-center p-4 md:p-12 overflow-hidden">
                            {/* Desktop Nav Arrows */}
                            <div className="hidden md:flex absolute inset-x-8 top-1/2 -translate-y-1/2 justify-between pointer-events-none z-20">
                                <button 
                                    onClick={() => setActiveImage(prev => prev > 0 ? prev - 1 : product.images.length - 1)}
                                    className="w-14 h-14 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-900 shadow-2xl hover:bg-indigo-50 transition-all active:scale-90 pointer-events-auto"
                                >
                                    <ChevronRight className="w-7 h-7 rotate-180" />
                                </button>
                                <button 
                                    onClick={() => setActiveImage(prev => prev < product.images.length - 1 ? prev + 1 : 0)}
                                    className="w-14 h-14 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-900 shadow-2xl hover:bg-indigo-50 transition-all active:scale-90 pointer-events-auto"
                                >
                                    <ChevronRight className="w-7 h-7" />
                                </button>
                            </div>

                            <motion.img 
                                key={activeImage}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                src={product.images[activeImage]} 
                                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-slate-100 bg-white"
                            />
                        </div>

                        {/* Bottom Thumbnail Strip */}
                        <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50">
                            <div className="flex justify-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                                {product.images.map((img, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => setActiveImage(idx)} 
                                        className={cn(
                                            "w-16 h-16 md:w-24 md:h-24 rounded-2xl overflow-hidden border-4 transition-all flex-shrink-0 snap-center",
                                            activeImage === idx ? "border-indigo-600 shadow-xl scale-105" : "border-white opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <StoreFooter />
            <CartOverlay isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            {product && <SocialProofToasts products={[product]} />}
        </div>
    );
}
