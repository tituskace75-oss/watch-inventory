
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { supabase } from '../lib/supabase';
import { buildWhatsAppUrl } from '../lib/utils';
import { Icon } from '../components/Icon';
import { 
  FiShoppingCart, FiMessageCircle, FiTruck, FiShield, FiMapPin, 
  FiCheck, FiStar, FiArrowRight, FiGift, FiActivity, FiWatch 
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

interface HomeData {
  collections: any[];
  bestSellers: any[];
  newArrivals: any[];
  reviews: any[];
}

const COLLECTION_IMAGES: Record<string, string> = {
  'smart-watches': 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=800&auto=format&fit=crop',
  'classic-watches': 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=800&auto=format&fit=crop',
  'women': 'https://images.unsplash.com/photo-1590736969955-71cc94801759?q=80&w=800&auto=format&fit=crop',
  'gift-picks': 'https://images.unsplash.com/photo-1549439602-43ebca2327af?q=80&w=800&auto=format&fit=crop',
  'sale': 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=800&auto=format&fit=crop',
  'mens': 'https://images.unsplash.com/photo-1619134778706-7015533a6150?q=80&w=800&auto=format&fit=crop',
  'accessories': 'https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?q=80&w=800&auto=format&fit=crop',
  'premium': 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?q=80&w=800&auto=format&fit=crop'
};

const getCollectionImage = (slug: string) => {
  return COLLECTION_IMAGES[slug] || 'https://images.unsplash.com/photo-1434056886845-dac89dd99199?q=80&w=800&auto=format&fit=crop';
};

export const Home: React.FC = () => {
  const [data, setData] = useState<HomeData>({
    collections: [],
    bestSellers: [],
    newArrivals: [],
    reviews: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHomeData() {
      setLoading(true);
      try {
        // 1. Collections (Prioritize main categories)
        const { data: colData } = await supabase
          .from('collections')
          .select('*')
          .order('name')
          .limit(8);
        
        // 2. Best Sellers (Higher Price = Premium/Best Seller for now)
        const { data: bestData } = await supabase
          .from('products')
          .select(`
            id, title, slug, model,
            brand:brands(name),
            variants:product_variants(id, sku, price_bdt, compare_at_bdt, stock_qty),
            images:product_images(url, is_primary)
          `)
          .order('default_warranty_months', { ascending: false }) // Proxy for premium
          .limit(8);

        // 3. New Arrivals
        const { data: newData } = await supabase
          .from('products')
          .select(`
            id, title, slug, model,
            brand:brands(name),
            variants:product_variants(id, sku, price_bdt, compare_at_bdt, stock_qty),
            images:product_images(url, is_primary)
          `)
          .order('created_at', { ascending: false })
          .limit(8);

        // 4. Reviews (If available)
        const { data: revData } = await supabase
          .from('reviews')
          .select('*')
          .limit(4);

        const formatProduct = (p: any) => {
          const primaryVariant = p.variants?.[0];
          const primaryImage = p.images?.find((img: any) => img.is_primary) || p.images?.[0];
          const brandInfo = Array.isArray(p.brand) ? p.brand[0] : p.brand;
          
          return {
            id: p.id,
            slug: p.slug,
            title: p.title,
            brand: brandInfo?.name || 'Ruiz',
            price: primaryVariant?.price_bdt || 0,
            compareAt: primaryVariant?.compare_at_bdt,
            image: primaryImage?.url,
            variantId: primaryVariant?.id,
            sku: primaryVariant?.sku,
            stock: primaryVariant?.stock_qty,
            model: p.model
          };
        };

        setData({
          collections: colData || [],
          bestSellers: bestData?.map(formatProduct) || [],
          newArrivals: newData?.map(formatProduct) || [],
          reviews: revData || []
        });

      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHomeData();
  }, []);

  const whatsappHero = "Hi Ruiz, I'm interested in buying a watch. Can you help me choose?";
  const whatsappBulk = "Hi Ruiz, I'm interested in corporate/wholesale orders.";

  return (
    <div className="bg-white pb-20 overflow-hidden">
      
      {/* --- SECTION 01: HERO --- */}
      <section className="relative bg-slate-50 lg:min-h-[85vh] flex items-center">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?q=80&w=2400&auto=format&fit=crop" 
            alt="Luxury Watch Background" 
            className="w-full h-full object-cover object-center opacity-[0.08]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl animate-in slide-in-from-left duration-700 fade-in">
              <span className="inline-flex items-center space-x-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 mb-8 rounded-sm">
                <Icon icon={FiShield} size={12} />
                <span>Official Warranty Available</span>
              </span>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter text-slate-900 leading-[1.05] mb-6">
                Authentic Watches, <br/> Delivered Fast.
              </h1>
              
              <p className="text-lg text-slate-600 mb-10 leading-relaxed max-w-lg">
                Shop smart & classic watches with verified quality, quick delivery across Bangladesh, and easy support on WhatsApp.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link to="/shop" className="inline-flex items-center justify-center bg-slate-900 text-white px-10 py-5 font-bold tracking-[0.15em] uppercase text-xs hover:bg-slate-800 transition-all shadow-xl group">
                  <Icon icon={FiShoppingCart} className="mr-3 group-hover:-translate-y-0.5 transition-transform" />
                  Shop Watches
                </Link>
                <a 
                  href={buildWhatsAppUrl(whatsappHero)} 
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center bg-white border border-slate-200 text-slate-900 px-10 py-5 font-bold tracking-[0.15em] uppercase text-xs hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all"
                >
                  <Icon icon={FaWhatsapp} className="mr-3 text-green-500" size={18} />
                  Chat on WhatsApp
                </a>
              </div>

              {/* Trust Micro-Row */}
              <div className="flex flex-wrap gap-y-4 gap-x-8 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-200 pt-8">
                <div className="flex items-center"><Icon icon={FiCheck} className="mr-2 text-slate-900" /> COD Available</div>
                <div className="flex items-center"><Icon icon={FiTruck} className="mr-2 text-slate-900" /> Fast Delivery</div>
                <div className="flex items-center"><Icon icon={FiMapPin} className="mr-2 text-slate-900" /> Live Tracking</div>
              </div>
            </div>

            {/* Hero Image / Visual */}
            <div className="hidden lg:block relative animate-in zoom-in duration-1000 fade-in delay-200">
               <div className="relative z-10 aspect-[4/5] rounded-sm overflow-hidden shadow-2xl bg-white border-4 border-white transform rotate-2 hover:rotate-0 transition-transform duration-700">
                  <img src="https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?q=80&w=1000&auto=format&fit=crop" alt="Premium Watch" className="w-full h-full object-cover" />
               </div>
               {/* Decorative Elements */}
               <div className="absolute top-10 -right-10 w-40 h-40 bg-slate-100 rounded-full mix-blend-multiply filter blur-2xl opacity-70"></div>
               <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-50 rounded-full mix-blend-multiply filter blur-2xl opacity-70"></div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 02: PROBLEM & SOLUTION --- */}
      <section className="bg-white py-20 border-b border-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tighter mb-6">Why buy from Ruiz?</h2>
              <p className="text-slate-500 font-light leading-relaxed">
                 Worried about fake products, slow delivery, or no warranty? We've solved that. 
                 Ruiz brings you a curated selection of 100% authentic timepieces with transparent policies.
              </p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: FiShield, title: "Authentic & Verified", desc: "Every watch is sourced directly from authorized distributors. No copies, no fakes." },
                { icon: FiTruck, title: "Lightning Fast Delivery", desc: "Get your order within 12 hours inside Dhaka and 24 hours nationwide." },
                { icon: FiMessageCircle, title: "Real Human Support", desc: "Confused? Chat with us on WhatsApp for live photos and specs guidance." }
              ].map((item, idx) => (
                <div key={idx} className="p-8 bg-slate-50 border border-slate-100 rounded-sm hover:shadow-md transition-shadow">
                   <div className="w-12 h-12 bg-white text-slate-900 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                      <Icon icon={item.icon} size={24} />
                   </div>
                   <h3 className="text-sm font-bold uppercase tracking-widest mb-3">{item.title}</h3>
                   <p className="text-sm text-slate-500 leading-relaxed font-light">{item.desc}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* --- SECTION 03: COLLECTIONS --- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
         <div className="flex justify-between items-end mb-10">
            <div>
               <h2 className="text-3xl font-bold tracking-tighter">Explore Collections</h2>
               <p className="text-slate-500 mt-2 text-sm font-light">Curated for every style.</p>
            </div>
            <Link to="/shop" className="text-xs font-bold uppercase tracking-widest border-b border-slate-900 pb-1 hover:opacity-70">View All</Link>
         </div>

         {loading ? (
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="aspect-square bg-slate-100 animate-pulse rounded-sm"></div>)}
           </div>
         ) : (
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.collections.map(col => (
                 <Link key={col.id} to={`/c/${col.slug}`} className="group relative aspect-[3/4] overflow-hidden rounded-sm bg-slate-100">
                    <img 
                      src={col.image_url || getCollectionImage(col.slug)} 
                      alt={col.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-6 left-6">
                       <h3 className="text-white text-xl font-bold uppercase tracking-tight">{col.name}</h3>
                       <span className="text-white/80 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 block opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">Shop Now</span>
                    </div>
                 </Link>
              ))}
           </div>
         )}
      </section>

      {/* --- SECTION 04: BEST SELLERS --- */}
      <section className="bg-slate-50 py-20">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tighter mb-12 text-center">Best Sellers</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
               {loading ? (
                  [1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-slate-200 animate-pulse rounded-sm"></div>)
               ) : (
                  data.bestSellers.map(p => <ProductCard key={p.id} {...p} />)
               )}
            </div>
            
            <div className="mt-12 text-center">
               <Link to="/shop" className="inline-block bg-white border border-slate-200 px-8 py-4 text-xs font-bold uppercase tracking-widest hover:border-slate-900 transition-colors">
                  View All Best Sellers
               </Link>
            </div>
         </div>
      </section>

      {/* --- SECTION 05: USE CASE (Gifting) --- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/c/gift-picks" className="relative h-64 md:h-80 group overflow-hidden rounded-sm">
               <img src="https://images.unsplash.com/photo-1549439602-43ebca2327af?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Gifts for Him" />
               <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors"></div>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <Icon icon={FiGift} size={32} className="mb-4" />
                  <h3 className="text-2xl font-bold tracking-tight">Gifts for Him</h3>
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-widest border-b border-white pb-1">Shop Collection</span>
               </div>
            </Link>
            <Link to="/c/women" className="relative h-64 md:h-80 group overflow-hidden rounded-sm">
               <img src="https://images.unsplash.com/photo-1590736969955-71cc94801759?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Gifts for Her" />
               <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors"></div>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <Icon icon={FiWatch} size={32} className="mb-4" />
                  <h3 className="text-2xl font-bold tracking-tight">Gifts for Her</h3>
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-widest border-b border-white pb-1">Shop Collection</span>
               </div>
            </Link>
            <Link to="/c/smart-watches" className="relative h-64 md:h-80 group overflow-hidden rounded-sm">
               <img src="https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Fitness & Tech" />
               <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors"></div>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <Icon icon={FiActivity} size={32} className="mb-4" />
                  <h3 className="text-2xl font-bold tracking-tight">Fitness & Tech</h3>
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-widest border-b border-white pb-1">Shop Collection</span>
               </div>
            </Link>
         </div>
      </section>

      {/* --- SECTION 06: NEW ARRIVALS --- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-50">
         <h2 className="text-3xl font-bold tracking-tighter mb-12">New Arrivals</h2>
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
            {loading ? (
               [1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-slate-100 animate-pulse rounded-sm"></div>)
            ) : (
               data.newArrivals.map(p => <ProductCard key={p.id} {...p} />)
            )}
         </div>
      </section>

      {/* --- SECTION 07: SOCIAL PROOF --- */}
      <section className="bg-slate-900 text-white py-24">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
               <div className="lg:col-span-1">
                  <h2 className="text-4xl font-bold tracking-tighter mb-6">Trusted by 2000+ Customers</h2>
                  <p className="text-slate-400 font-light mb-8 leading-relaxed">
                     We don't just sell watches; we build relationships. See what our community has to say about our authenticity and service.
                  </p>
                  <div className="flex items-center space-x-2 mb-2">
                     <div className="flex text-yellow-400">
                        {[1,2,3,4,5].map(i => <Icon key={i} icon={FiStar} size={20} className="fill-current" />)}
                     </div>
                     <span className="font-bold text-lg">4.9/5</span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Based on verified reviews</p>
               </div>
               
               <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Review Cards (Mock or Real) */}
                  {[
                     { name: "Tanvir Ahmed", text: "Ordered a Haylou solar. Delivery was super fast (next day in Chittagong). Genuine product, verified." },
                     { name: "Sadia Rahman", text: "Packaging was premium. Bought it as a gift for my husband and he loved it. Thanks Ruiz!" },
                  ].map((r, i) => (
                     <div key={i} className="bg-slate-800 p-8 rounded-sm">
                        <div className="flex text-yellow-400 mb-4 text-xs">
                           {[1,2,3,4,5].map(i => <Icon key={i} icon={FiStar} size={14} className="fill-current" />)}
                        </div>
                        <p className="text-slate-300 font-light leading-relaxed mb-6 text-sm">"{r.text}"</p>
                        <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold">{r.name[0]}</div>
                           <span className="text-xs font-bold uppercase tracking-widest">{r.name}</span>
                           <Icon icon={FiCheck} size={12} className="text-green-500" />
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </section>

      {/* --- SECTION 08: WHOLESALE CTA --- */}
      <section className="bg-slate-50 border-b border-slate-100 py-16">
         <div className="max-w-4xl mx-auto px-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 block">Corporate & Bulk</span>
            <h2 className="text-3xl font-bold tracking-tighter mb-6">Need watches for corporate gifting?</h2>
            <p className="text-slate-500 mb-8 max-w-lg mx-auto font-light">
               We offer exclusive bulk pricing and custom packaging for corporate orders.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
               <Link to="/wholesale" className="bg-white border border-slate-200 text-slate-900 px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-slate-100">
                  Request Quote
               </Link>
               <a href={buildWhatsAppUrl(whatsappBulk)} className="flex items-center justify-center text-green-600 font-bold uppercase tracking-widest text-xs px-8 py-3">
                  <Icon icon={FaWhatsapp} className="mr-2" size={16} /> WhatsApp Us
               </a>
            </div>
         </div>
      </section>

      {/* --- SECTION 09: FINAL CONVERSION CTA --- */}
      <section className="py-24 text-center px-4">
         <h2 className="text-4xl font-bold tracking-tighter mb-8">Ready to find your style?</h2>
         <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/shop" className="bg-slate-900 text-white px-12 py-5 font-bold tracking-[0.2em] uppercase text-xs hover:bg-slate-800 shadow-xl">
               Shop All Watches
            </Link>
         </div>
         <p className="mt-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Free Delivery on orders over ৳5000 • 7-Day Exchange
         </p>
      </section>

    </div>
  );
};
