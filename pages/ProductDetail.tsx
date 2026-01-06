
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { supabase } from '../lib/supabase';
import { Product, ProductVariant, ProductImage, Review } from '../types';
import { buildWhatsAppUrl, formatCurrency, formatDate } from '../lib/utils';
import { ProductCard } from '../components/ProductCard';
import { Icon } from '../components/Icon';
import { FiHeart, FiTruck, FiShield, FiRefreshCw, FiCheck, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { FaStar, FaWhatsapp } from 'react-icons/fa';

export const ProductDetail: React.FC = () => {
  const { productSlug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  // Data State
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'shipping' | 'warranty'>('desc');
  const [addingToCart, setAddingToCart] = useState(false);

  // Refs for scrolling
  const reviewsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchProductData() {
      setLoading(true);
      try {
        // 1. Fetch Product
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select(`*, brand:brands(*)`)
          .eq('slug', productSlug)
          .single();

        if (prodError || !prodData) throw new Error('Product not found');
        setProduct(prodData);

        // 2. Fetch Variants
        const { data: varData } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', prodData.id)
          .order('price_bdt', { ascending: true });
        
        if (varData && varData.length > 0) {
            setVariants(varData);
            // Auto-select first in-stock variant, or just first one
            const inStock = varData.find((v: ProductVariant) => v.stock_qty > 0);
            setSelectedVariantId(inStock ? inStock.id : varData[0].id);
        }

        // 3. Fetch Images
        const { data: imgData } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', prodData.id)
          .order('is_primary', { ascending: false }); // Primary first
        if (imgData) setImages(imgData);

        // 4. Fetch Reviews (Try/Catch in case table missing)
        try {
          const { data: revData } = await supabase
            .from('reviews')
            .select(`*, media:review_media(*)`)
            .eq('product_id', prodData.id)
            .order('created_at', { ascending: false })
            .limit(10);
          if (revData) setReviews(revData);
        } catch (e) { console.log('Reviews not loaded'); }

        // 5. Fetch Related (Same Brand or Type)
        const { data: relatedData } = await supabase
            .from('products')
            .select(`
                id, title, slug,
                brand:brands(name),
                variants:product_variants(id, price_bdt, compare_at_bdt, stock_qty),
                images:product_images(url, is_primary)
            `)
            .eq('brand_id', prodData.brand_id)
            .neq('id', prodData.id)
            .limit(4);
            
        if (relatedData) {
             const formatted = relatedData.map((p: any) => ({
                id: p.id,
                slug: p.slug,
                title: p.title,
                brand: Array.isArray(p.brand) ? p.brand[0]?.name : p.brand?.name || 'Ruiz',
                price: p.variants?.[0]?.price_bdt || 0,
                compareAt: p.variants?.[0]?.compare_at_bdt,
                image: p.images?.find((i: any) => i.is_primary)?.url || p.images?.[0]?.url
            }));
            setRelatedProducts(formatted);
        }

      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    
    if (productSlug) {
        fetchProductData();
        // Reset state
        setSelectedImageIndex(0);
        setQty(1);
        setActiveTab('desc');
        window.scrollTo(0, 0);
    }
  }, [productSlug]);

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-pulse text-xs font-bold tracking-[0.2em] uppercase">Loading Timepiece...</div></div>;
  if (!product) return <div className="h-screen flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold mb-4">Product Not Found</h1><Link to="/shop" className="underline">Back to Shop</Link></div></div>;

  const selectedVariant = variants.find(v => v.id === selectedVariantId) || variants[0];
  const brandName = product.brand?.name || 'Ruiz';
  const isSmart = product.watch_type === 'smartwatch';
  const discount = selectedVariant?.compare_at_bdt ? Math.round(((selectedVariant.compare_at_bdt - selectedVariant.price_bdt) / selectedVariant.compare_at_bdt) * 100) : 0;
  const isOutOfStock = selectedVariant?.stock_qty === 0;

  const handleAddToCart = (isBuyNow = false) => {
    if (!selectedVariant) return;
    setAddingToCart(true);

    const item = {
      variant_id: selectedVariant.id,
      product_id: product.id,
      sku: selectedVariant.sku,
      qty: qty,
      title: product.title,
      model: selectedVariant.title || product.model,
      brand_name: brandName,
      price: selectedVariant.price_bdt,
      image: images[0]?.url || '',
      stock: selectedVariant.stock_qty
    };

    addToCart(item);
    
    setTimeout(() => {
        setAddingToCart(false);
        if (isBuyNow) {
            navigate('/checkout');
        } else {
            // Toast or feedback could go here
        }
    }, 600);
  };

  const whatsappMessage = `Hi Ruiz, I want to order: ${product.title} (SKU: ${selectedVariant?.sku}). Please confirm availability.`;

  return (
    <div className="bg-white min-h-screen pb-24">
      
      {/* --- SECTION A: ABOVE THE FOLD --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Breadcrumbs */}
        <nav className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-8 flex flex-wrap gap-2">
            <Link to="/" className="hover:text-slate-900">Home</Link> <span>/</span>
            <Link to="/shop" className="hover:text-slate-900">Collection</Link> <span>/</span>
            <span className="text-slate-900">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
            
            {/* LEFT: IMAGE GALLERY */}
            <div className="lg:col-span-7 space-y-4">
                <div className="aspect-[4/5] md:aspect-square bg-slate-50 overflow-hidden rounded-sm relative group cursor-zoom-in">
                    <img 
                        src={images[selectedImageIndex]?.url} 
                        alt={product.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                        {discount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest">{discount}% OFF</span>}
                        {product.highlights?.includes('New') && <span className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest">New Arrival</span>}
                    </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                    {images.map((img, idx) => (
                        <button 
                            key={img.id} 
                            onClick={() => setSelectedImageIndex(idx)}
                            className={`flex-shrink-0 w-20 h-20 bg-slate-50 rounded-sm overflow-hidden border-2 transition-all ${selectedImageIndex === idx ? 'border-slate-900 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        >
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            </div>

            {/* RIGHT: PURCHASE PANEL */}
            <div className="lg:col-span-5 flex flex-col">
                <div className="mb-2">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{brandName}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-slate-900 mb-4 leading-tight">{product.title}</h1>
                
                {/* Rating */}
                <div className="flex items-center space-x-2 mb-8 cursor-pointer" onClick={() => reviewsRef.current?.scrollIntoView({behavior: 'smooth'})}>
                    <div className="flex text-yellow-400 text-sm">
                        {[1,2,3,4,5].map(i => <Icon key={i} icon={FaStar} size={14} className="ml-0.5" />)}
                    </div>
                    <span className="text-xs font-bold text-slate-400 underline decoration-slate-200 underline-offset-4">
                        {reviews.length > 0 ? `${reviews.length} Reviews` : 'Be the first to review'}
                    </span>
                </div>

                {/* Price Block */}
                <div className="flex items-baseline space-x-4 mb-8">
                    <span className="text-3xl font-bold text-slate-900">{formatCurrency(selectedVariant.price_bdt)}</span>
                    {selectedVariant.compare_at_bdt && (
                        <span className="text-xl text-slate-400 line-through decoration-1">{formatCurrency(selectedVariant.compare_at_bdt)}</span>
                    )}
                </div>

                {/* Variant Selection */}
                <div className="space-y-6 mb-8 border-t border-b border-slate-50 py-8">
                    {/* Simplified Variant Selector - Assume Flat List for Phase 1 */}
                    <div>
                        <div className="flex justify-between mb-3">
                             <label className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Select Option</label>
                             <span className={`text-[10px] font-bold uppercase tracking-widest ${isOutOfStock ? 'text-red-500' : 'text-green-600'}`}>
                                {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                             </span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {variants.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => setSelectedVariantId(v.id)}
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border rounded-sm transition-all min-w-[80px] text-center
                                    ${selectedVariantId === v.id 
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                    } ${v.stock_qty === 0 ? 'opacity-50 line-through decoration-slate-400' : ''}`}
                                    disabled={v.stock_qty === 0}
                                >
                                    {v.color || v.title}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center space-x-4">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Quantity</label>
                        <div className="flex items-center border border-slate-200 rounded-sm h-10">
                            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-full hover:bg-slate-50 font-bold">-</button>
                            <span className="w-10 text-center text-sm font-bold">{qty}</span>
                            <button onClick={() => setQty(Math.min(selectedVariant.stock_qty, qty + 1))} className="w-10 h-full hover:bg-slate-50 font-bold">+</button>
                        </div>
                    </div>
                </div>

                {/* CTAs */}
                <div className="space-y-3 mb-8">
                    <div className="flex gap-3">
                        <button 
                            onClick={() => handleAddToCart(false)}
                            disabled={isOutOfStock || addingToCart}
                            className="flex-1 bg-slate-900 text-white py-4 font-bold tracking-[0.2em] uppercase text-xs hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl"
                        >
                            {addingToCart ? 'Adding...' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                        <button 
                            onClick={() => toggleWishlist(product.id)}
                            className={`w-14 flex items-center justify-center border transition-all ${isInWishlist(product.id) ? 'bg-red-50 border-red-100 text-red-500' : 'border-slate-200 hover:bg-slate-50 text-slate-400'}`}
                        >
                            <Icon icon={FiHeart} size={24} className={isInWishlist(product.id) ? "fill-current" : ""} />
                        </button>
                    </div>
                    <button 
                        onClick={() => handleAddToCart(true)}
                        disabled={isOutOfStock}
                        className="w-full border border-slate-900 text-slate-900 py-4 font-bold tracking-[0.2em] uppercase text-xs hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                        Buy Now
                    </button>
                    <a 
                        href={buildWhatsAppUrl(whatsappMessage)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center w-full bg-[#25D366] text-white py-4 font-bold tracking-[0.2em] uppercase text-xs hover:bg-[#20bd5a] transition-all shadow-sm"
                    >
                        <Icon icon={FaWhatsapp} size={16} className="mr-2" />
                        Ask on WhatsApp
                    </a>
                </div>

                {/* Trust Signals */}
                <div className="bg-slate-50 p-6 rounded-sm space-y-3">
                    <div className="flex items-center text-xs text-slate-600">
                        <Icon icon={FiCheck} size={16} className="mr-3 text-slate-900" />
                        Cash on Delivery Available
                    </div>
                    <div className="flex items-center text-xs text-slate-600">
                        <Icon icon={FiTruck} size={16} className="mr-3 text-slate-900" />
                        Dhaka: 12h • Nationwide: 24h
                    </div>
                    <div className="flex items-center text-xs text-slate-600">
                        <Icon icon={FiShield} size={16} className="mr-3 text-slate-900" />
                        {selectedVariant.warranty_months > 0 ? `${selectedVariant.warranty_months} Months Warranty` : 'Brand Warranty'}
                    </div>
                    <div className="flex items-center text-xs text-slate-600">
                        <Icon icon={FiRefreshCw} size={16} className="mr-3 text-slate-900" />
                        7-Day Easy Exchange Policy
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* --- SECTION B: KEY HIGHLIGHTS --- */}
      <div className="bg-slate-50 border-y border-slate-100 py-12">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center gap-4">
               {product.highlights?.map((h, i) => (
                  <div key={i} className="bg-white border border-slate-200 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest text-slate-900 shadow-sm">
                     {h}
                  </div>
               ))}
               {!product.highlights?.length && (
                 <>
                    <div className="bg-white border border-slate-200 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest text-slate-900 shadow-sm">100% Authentic</div>
                    <div className="bg-white border border-slate-200 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest text-slate-900 shadow-sm">Fast Shipping</div>
                    <div className="bg-white border border-slate-200 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest text-slate-900 shadow-sm">Premium Build</div>
                 </>
               )}
            </div>
         </div>
      </div>

      {/* --- SECTION C: SMART vs CLASSIC LAYOUT --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
         {isSmart ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               {/* Smart Layout */}
               <div className="p-8 bg-slate-50 rounded-sm border border-slate-100">
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Display & Build</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedVariant.specs?.display || 'High-res AMOLED display'} with premium casing.</p>
               </div>
               <div className="p-8 bg-slate-50 rounded-sm border border-slate-100">
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Health Suite</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Heart rate, SpO2, Sleep tracking, and {selectedVariant.specs?.modes || '100+'} sports modes.</p>
               </div>
               <div className="p-8 bg-slate-50 rounded-sm border border-slate-100">
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Battery Life</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Up to {selectedVariant.specs?.battery_days || '5-7'} days on a single charge.</p>
               </div>
               <div className="p-8 bg-slate-50 rounded-sm border border-slate-100">
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Connectivity</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Bluetooth Calling, Notification sync. Works with iOS & Android.</p>
               </div>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* Classic Layout */}
               <div className="p-10 bg-slate-50 rounded-sm border border-slate-100 text-center">
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Movement</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedVariant.specs?.movement || 'Japanese Quartz'} Movement for precise timekeeping.</p>
               </div>
               <div className="p-10 bg-slate-50 rounded-sm border border-slate-100 text-center">
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Materials</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedVariant.specs?.glass || 'Mineral Glass'} & {selectedVariant.specs?.case_material || 'Stainless Steel'}.</p>
               </div>
               <div className="p-10 bg-slate-50 rounded-sm border border-slate-100 text-center">
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Water Resistance</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedVariant.specs?.water_resistance || '3ATM'} (Splash Resistant).</p>
               </div>
            </div>
         )}
      </div>

      {/* --- SECTION D: TABS --- */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
         <div className="flex border-b border-slate-200 mb-8 overflow-x-auto no-scrollbar">
            {[
                { id: 'desc', label: 'Description' },
                { id: 'specs', label: 'Specifications' },
                { id: 'shipping', label: 'Shipping' },
                { id: 'warranty', label: 'Warranty' }
            ].map((tab) => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-8 py-4 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${activeTab === tab.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    {tab.label}
                </button>
            ))}
         </div>
         <div className="prose prose-slate max-w-none text-sm text-slate-600 leading-loose">
            {activeTab === 'desc' && (
                <div>
                    <p className="mb-4 font-medium text-lg text-slate-900">{product.title}</p>
                    <p>{product.short_description || 'Experience the perfect blend of style and functionality with this premium timepiece from Ruiz. Designed for the modern individual, it offers durability, elegance, and reliable performance.'}</p>
                </div>
            )}
            {activeTab === 'specs' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(selectedVariant.specs || {}).map(([key, val]) => (
                        <div key={key} className="flex justify-between border-b border-slate-100 py-2">
                            <span className="font-bold capitalize">{key.replace(/_/g, ' ')}</span>
                            <span>{String(val)}</span>
                        </div>
                    ))}
                    {!selectedVariant.specs && <p>Detailed specifications coming soon.</p>}
                </div>
            )}
            {activeTab === 'shipping' && (
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Dhaka City:</strong> Same day or next day delivery (Target: 12-24h).</li>
                    <li><strong>Nationwide:</strong> 24-48 hours via premium couriers.</li>
                    <li><strong>Cash on Delivery:</strong> Available for all locations.</li>
                    <li><strong>Inspection:</strong> You may check the parcel before payment (if allowed by courier).</li>
                </ul>
            )}
            {activeTab === 'warranty' && (
                <div>
                    <p className="mb-4">This product comes with a <strong>{selectedVariant.warranty_months} Months Warranty</strong> covering manufacturing defects.</p>
                    <p><strong>Covered:</strong> Engine/Movement issues, Battery (if applicable), Sensor malfunctions.</p>
                    <p><strong>Not Covered:</strong> Physical damage, water damage beyond rating, wear and tear of straps.</p>
                </div>
            )}
         </div>
      </div>

      {/* --- SECTION E: REVIEWS --- */}
      <div ref={reviewsRef} className="bg-slate-50 py-20 border-t border-slate-200">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold tracking-tighter mb-12 text-center">Customer Reviews</h2>
            
            {reviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {reviews.map(review => (
                        <div key={review.id} className="bg-white p-8 rounded-sm shadow-sm border border-slate-100">
                            <div className="flex text-yellow-400 text-xs mb-3">
                                {[...Array(review.rating)].map((_, i) => <Icon key={i} icon={FaStar} size={12} className="ml-0.5" />)}
                            </div>
                            <h4 className="font-bold text-sm mb-2">{review.title}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed mb-4">{review.body}</p>
                            {review.media && review.media.length > 0 && (
                                <div className="flex gap-2 mb-4 overflow-x-auto">
                                    {review.media.map(m => (
                                        <div key={m.id} className="w-16 h-16 bg-slate-100 rounded-sm overflow-hidden flex-shrink-0">
                                            {m.type === 'video' ? <video src={m.url} className="w-full h-full object-cover"/> : <img src={m.url} className="w-full h-full object-cover"/>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-between items-center border-t border-slate-50 pt-4">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{review.user_name || 'Verified Buyer'}</span>
                                <span className="text-[10px] text-slate-300">{formatDate(review.created_at)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center max-w-md mx-auto">
                    <p className="text-slate-500 mb-6">No reviews yet. Be the first to share your experience with this timepiece.</p>
                    <button className="text-xs font-bold uppercase tracking-widest border-b border-slate-900 pb-1">Write a Review</button>
                </div>
            )}
         </div>
      </div>

      {/* --- SECTION F: RELATED PRODUCTS --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
         <h2 className="text-2xl font-bold tracking-tighter mb-12 text-center">You May Also Like</h2>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
            {relatedProducts.map(p => (
                <ProductCard key={p.id} {...p} />
            ))}
         </div>
      </div>

      {/* --- SECTION G: SUPPORT CTA --- */}
      <div className="bg-slate-900 text-white py-16 px-4 text-center">
         <h2 className="text-2xl font-bold tracking-tighter mb-4">Need help choosing?</h2>
         <p className="text-slate-400 mb-8 max-w-lg mx-auto text-sm">Our watch experts are available to guide you through specs, styling, and availability.</p>
         <div className="flex flex-col sm:flex-row justify-center gap-4">
             <a href={buildWhatsAppUrl(whatsappMessage)} className="bg-white text-slate-900 px-8 py-4 font-bold tracking-widest uppercase text-xs hover:bg-slate-100 transition-colors">Chat on WhatsApp</a>
             <a href="tel:01571339897" className="border border-white/20 text-white px-8 py-4 font-bold tracking-widest uppercase text-xs hover:bg-white/10 transition-colors">Call 01571339897</a>
         </div>
      </div>

      {/* --- MOBILE STICKY BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 lg:hidden z-40 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <div className="flex-1">
             <p className="text-[10px] text-slate-400 uppercase font-bold">{product.title.substring(0, 20)}...</p>
             <p className="text-lg font-bold text-slate-900">{formatCurrency(selectedVariant.price_bdt)}</p>
         </div>
         <button 
             onClick={() => handleAddToCart(false)}
             disabled={isOutOfStock || addingToCart}
             className="flex-1 bg-slate-900 text-white font-bold tracking-widest uppercase text-[10px] rounded-sm disabled:opacity-50"
         >
             {isOutOfStock ? 'Sold Out' : addingToCart ? 'Adding...' : 'Add to Cart'}
         </button>
         <a 
             href={buildWhatsAppUrl(whatsappMessage)}
             className="px-4 flex items-center justify-center bg-[#25D366] text-white rounded-sm"
         >
             <Icon icon={FaWhatsapp} size={20} />
         </a>
      </div>
    </div>
  );
};
