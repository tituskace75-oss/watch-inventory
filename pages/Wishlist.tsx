
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, buildWhatsAppUrl } from '../lib/utils';
import { Icon } from '../components/Icon';
import { FiTrash2, FiShoppingBag, FiHeart, FiArrowRight, FiAlertCircle } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

interface WishlistProduct {
  id: string;
  slug: string;
  title: string;
  brand_name: string;
  image: string;
  min_price: number;
  badges: string[];
  variants: any[];
}

export const Wishlist: React.FC = () => {
  const { wishlist, toggleWishlist, clearWishlist, loading: wishlistLoading } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // productId being moved

  useEffect(() => {
    async function fetchWishlistProducts() {
      if (wishlist.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data } = await supabase
          .from('products')
          .select(`
            id, title, slug, watch_type, model,
            brand:brands(name),
            variants:product_variants(id, sku, title, price_bdt, compare_at_bdt, stock_qty),
            images:product_images(url, is_primary)
          `)
          .in('id', wishlist);

        if (data) {
          const formatted: WishlistProduct[] = data.map((p: any) => {
            const primaryImage = p.images?.find((img: any) => img.is_primary) || p.images?.[0];
            const brandInfo = Array.isArray(p.brand) ? p.brand[0] : p.brand;
            
            // Calculate price range or min price
            const activeVariants = p.variants || [];
            const minPrice = activeVariants.length > 0 
                ? Math.min(...activeVariants.map((v: any) => v.price_bdt))
                : 0;

            // Badges
            const badges = [];
            if (p.watch_type === 'smartwatch') badges.push('Smart');
            else badges.push('Classic');
            
            const hasDiscount = activeVariants.some((v: any) => v.compare_at_bdt > v.price_bdt);
            if (hasDiscount) badges.push('Sale');

            return {
              id: p.id,
              slug: p.slug,
              title: p.title,
              brand_name: brandInfo?.name || 'Ruiz',
              image: primaryImage?.url || `https://picsum.photos/400/500?random=${p.id}`,
              min_price: minPrice,
              badges,
              variants: activeVariants
            };
          });
          setProducts(formatted);
        }
      } catch (err) {
        console.error('Error fetching wishlist products:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchWishlistProducts();
  }, [wishlist]);

  const handleMoveToCart = async (product: WishlistProduct) => {
    setActionLoading(product.id);
    
    // Logic: Find first in-stock variant
    const inStockVariant = product.variants.find((v: any) => v.stock_qty > 0);
    const targetVariant = inStockVariant || product.variants[0];

    if (!targetVariant) {
        alert('Product currently unavailable.');
        setActionLoading(null);
        return;
    }

    if (targetVariant.stock_qty === 0) {
        alert('This item is currently out of stock.');
        setActionLoading(null);
        return;
    }

    // Add to cart
    addToCart({
        variant_id: targetVariant.id,
        product_id: product.id,
        sku: targetVariant.sku,
        qty: 1,
        title: product.title,
        model: targetVariant.title || 'Standard',
        brand_name: product.brand_name,
        price: targetVariant.price_bdt,
        image: product.image,
        stock: targetVariant.stock_qty
    });

    // Remove from wishlist
    await toggleWishlist(product.id);
    
    setActionLoading(null);
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear your wishlist?')) {
        await clearWishlist();
    }
  };

  if (wishlistLoading || loading) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4"></div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Wishlist...</p>
          </div>
      );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <Icon icon={FiHeart} size={32} className="text-slate-300" />
        </div>
        <h1 className="text-3xl font-bold tracking-tighter mb-4">Your wishlist is empty.</h1>
        <p className="text-slate-500 mb-8 max-w-sm font-light">
          Save items you love here to track their price or buy them later.
        </p>
        <Link to="/shop" className="bg-slate-900 text-white px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
          Browse Watches
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
         <div>
            <h1 className="text-4xl font-bold tracking-tighter mb-2">My Wishlist</h1>
            <p className="text-slate-500 uppercase text-[10px] tracking-[0.2em] font-bold">
               {products.length} Saved Item{products.length !== 1 && 's'}
            </p>
         </div>
         <div className="flex gap-4">
             <Link to="/shop" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 border-b border-transparent hover:border-slate-900 pb-1 transition-all">
                 Continue Shopping
             </Link>
             <button onClick={handleClear} className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-600 border-b border-transparent hover:border-red-600 pb-1 transition-all">
                 Clear All
             </button>
         </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map((product) => {
            const isMoving = actionLoading === product.id;
            const hasStock = product.variants.some((v: any) => v.stock_qty > 0);

            return (
                <div key={product.id} className="group flex flex-col bg-white border border-slate-100 rounded-sm hover:shadow-lg transition-shadow duration-300">
                    {/* Image Area */}
                    <div className="relative aspect-[4/5] bg-slate-50 overflow-hidden">
                        <Link to={`/p/${product.slug}`}>
                            <img 
                                src={product.image} 
                                alt={product.title} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                        </Link>
                        
                        {/* Remove Button */}
                        <button 
                            onClick={() => toggleWishlist(product.id)}
                            className="absolute top-3 right-3 p-2 bg-white/90 text-slate-400 hover:text-red-500 rounded-full shadow-sm transition-colors z-10"
                            title="Remove from wishlist"
                        >
                            <Icon icon={FiTrash2} size={14} />
                        </button>

                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1">
                            {product.badges.map(b => (
                                <span key={b} className="bg-slate-900/90 text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest backdrop-blur-sm">
                                    {b}
                                </span>
                            ))}
                            {!hasStock && (
                                <span className="bg-red-500/90 text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest backdrop-blur-sm">
                                    Out of Stock
                                </span>
                            )}
                        </div>

                        {/* Quick Action Overlay (Desktop) */}
                        <div className="absolute bottom-0 inset-x-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 hidden lg:block bg-gradient-to-t from-black/50 to-transparent">
                            <button
                                onClick={() => handleMoveToCart(product)}
                                disabled={isMoving || !hasStock}
                                className="w-full bg-white text-slate-900 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 disabled:opacity-75 shadow-sm"
                            >
                                {isMoving ? 'Moving...' : hasStock ? 'Move to Cart' : 'Out of Stock'}
                            </button>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="p-5 flex flex-col flex-grow">
                        <div className="mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{product.brand_name}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight mb-2 line-clamp-2 min-h-[2.5em]">
                            <Link to={`/p/${product.slug}`}>{product.title}</Link>
                        </h3>
                        <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900">{formatCurrency(product.min_price)}</span>
                            
                            {/* Mobile Move to Cart Icon */}
                            <button 
                                onClick={() => handleMoveToCart(product)}
                                disabled={isMoving || !hasStock}
                                className="lg:hidden p-2 text-slate-900 bg-slate-100 rounded-full disabled:opacity-50"
                            >
                                <Icon icon={FiShoppingBag} size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>

      {/* Footer / Summary */}
      <div className="mt-20 pt-12 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="text-center md:text-left">
             <h3 className="text-lg font-bold tracking-tight mb-1">Need help deciding?</h3>
             <p className="text-slate-500 text-xs">Our experts can send you live photos or answer specs questions.</p>
         </div>
         <a 
            href={buildWhatsAppUrl("Hi Ruiz, I have questions about items in my wishlist.")} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center bg-[#25D366] text-white px-8 py-4 font-bold tracking-widest uppercase text-xs hover:bg-[#20bd5a] transition-all shadow-sm rounded-sm"
         >
            <Icon icon={FaWhatsapp} size={18} className="mr-2" />
            Chat on WhatsApp
         </a>
      </div>
    </div>
  );
};
