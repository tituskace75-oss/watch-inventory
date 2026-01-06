import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { buildWhatsAppUrl, formatCurrency } from '../lib/utils';
import { Icon } from '../components/Icon';
import { FiTrash2, FiMinus, FiPlus, FiArrowRight, FiTag, FiX, FiShield, FiLock, FiCheck } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

export const Cart: React.FC = () => {
  const { 
    cart, updateQty, removeFromCart, refreshCart, 
    subtotal, discountTotal, grandTotal, 
    applyCoupon, removeCoupon, coupon, isLoading 
  } = useCart();
  
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Hydrate cart on mount to ensure fresh prices and stock
  useEffect(() => {
    refreshCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    
    setIsApplying(true);
    setCouponMsg(null);
    const result = await applyCoupon(couponCode);
    setCouponMsg({ type: result.success ? 'success' : 'error', text: result.message });
    setIsApplying(false);
    if (result.success) setCouponCode('');
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  const hasOutOfStockItems = cart.some(item => item.qty > item.stock);
  const isCartEmpty = cart.length === 0;

  if (isCartEmpty) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-white px-4">
         <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <Icon icon={FiLock} size={32} className="text-slate-300" />
         </div>
         <h1 className="text-2xl font-bold tracking-tighter mb-2">Your cart is empty.</h1>
         <p className="text-slate-500 mb-8 max-w-sm text-center font-light">
           Looks like you haven't found your perfect timepiece yet. Browse our collections to find one.
         </p>
         <Link to="/shop" className="bg-slate-900 text-white px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
           Start Shopping
         </Link>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          
          <div className="mb-12">
             <h1 className="text-4xl font-bold tracking-tighter">Your Cart</h1>
             <p className="text-slate-500 mt-2 uppercase text-[10px] tracking-[0.2em] font-bold">
               {cart.length} Item{cart.length !== 1 && 's'} • Free Delivery in Dhaka
             </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-20">
             
             {/* LEFT COLUMN: Cart Items */}
             <div className="lg:col-span-2 space-y-8">
                {/* Headers (Desktop only) */}
                <div className="hidden md:grid grid-cols-12 gap-4 pb-4 border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                   <div className="col-span-6">Product</div>
                   <div className="col-span-2 text-center">Price</div>
                   <div className="col-span-2 text-center">Quantity</div>
                   <div className="col-span-2 text-right">Total</div>
                </div>

                {isLoading && (
                  <div className="space-y-4">
                     {[1,2].map(i => <div key={i} className="h-24 bg-slate-50 animate-pulse rounded-sm"></div>)}
                  </div>
                )}

                {!isLoading && cart.map((item) => {
                  const isOOS = item.stock === 0;
                  const isLowStock = !isOOS && item.stock < 5;
                  const isExceedingStock = item.qty > item.stock;

                  return (
                    <div key={item.variant_id} className="group relative">
                       <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center py-6 border-b border-slate-100">
                          
                          {/* Product Info */}
                          <div className="md:col-span-6 flex items-start space-x-6">
                             <Link to={`/p/${item.variant_id}`} className="block w-20 h-24 bg-slate-50 flex-shrink-0 overflow-hidden rounded-sm">
                                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                             </Link>
                             <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{item.brand_name}</div>
                                <Link to={`/p/${item.variant_id}`} className="font-bold text-slate-900 text-sm hover:underline">{item.title}</Link>
                                <div className="text-xs text-slate-500 mt-1">{item.model} <span className="mx-1">•</span> SKU: {item.sku}</div>
                                {isOOS ? (
                                   <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-2">Out of Stock</div>
                                ) : isExceedingStock ? (
                                   <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-2">Max Available: {item.stock}</div>
                                ) : isLowStock ? (
                                   <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-2">Low Stock: {item.stock} left</div>
                                ) : (
                                   <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-2">In Stock</div>
                                )}
                             </div>
                          </div>

                          {/* Price */}
                          <div className="md:col-span-2 text-left md:text-center font-medium text-sm">
                             <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase mr-2">Price:</span>
                             {formatCurrency(item.price)}
                          </div>

                          {/* Quantity */}
                          <div className="md:col-span-2 flex items-center justify-start md:justify-center">
                             <div className="flex items-center border border-slate-200 rounded-sm h-8">
                                <button 
                                   onClick={() => updateQty(item.variant_id, item.qty - 1)}
                                   className="w-8 h-full flex items-center justify-center hover:bg-slate-50 text-slate-600 disabled:opacity-30"
                                   disabled={item.qty <= 1}
                                >
                                   <Icon icon={FiMinus} size={12} />
                                </button>
                                <span className="w-8 text-center text-xs font-bold">{item.qty}</span>
                                <button 
                                   onClick={() => updateQty(item.variant_id, item.qty + 1)}
                                   className="w-8 h-full flex items-center justify-center hover:bg-slate-50 text-slate-600 disabled:opacity-30"
                                   disabled={item.qty >= item.stock}
                                >
                                   <Icon icon={FiPlus} size={12} />
                                </button>
                             </div>
                          </div>

                          {/* Total & Remove */}
                          <div className="md:col-span-2 flex items-center justify-between md:justify-end">
                             <div className="font-bold text-sm">
                                <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase mr-2">Total:</span>
                                {formatCurrency(item.price * item.qty)}
                             </div>
                             <button 
                                onClick={() => removeFromCart(item.variant_id)}
                                className="ml-4 text-slate-300 hover:text-red-500 transition-colors p-2"
                                aria-label="Remove item"
                             >
                                <Icon icon={FiTrash2} size={16} />
                             </button>
                          </div>
                       </div>
                    </div>
                  );
                })}

                <div className="pt-6">
                   <Link to="/shop" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 border-b border-transparent hover:border-slate-900 transition-all pb-1">
                      ← Continue Shopping
                   </Link>
                </div>
             </div>

             {/* RIGHT COLUMN: Summary */}
             <div className="lg:col-span-1">
                <div className="bg-slate-50 p-8 md:p-10 rounded-sm sticky top-24">
                   <h2 className="text-lg font-bold tracking-tight mb-6">Order Summary</h2>
                   
                   <div className="space-y-4 mb-8">
                      <div className="flex justify-between text-sm">
                         <span className="text-slate-500">Subtotal</span>
                         <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
                      </div>
                      
                      {discountTotal > 0 && (
                         <div className="flex justify-between text-sm text-green-600 animate-in fade-in slide-in-from-right-2">
                            <span className="flex items-center"><Icon icon={FiTag} size={14} className="mr-2"/> Discount</span>
                            <span className="font-bold">-{formatCurrency(discountTotal)}</span>
                         </div>
                      )}

                      <div className="flex justify-between text-sm">
                         <span className="text-slate-500">Shipping Estimate</span>
                         <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Calculated at Checkout</span>
                      </div>

                      <div className="border-t border-slate-200 pt-4 mt-4 flex justify-between items-end">
                         <span className="text-sm font-bold text-slate-900">Total</span>
                         <div className="text-right">
                            <span className="text-xl font-bold text-slate-900 block leading-none">{formatCurrency(grandTotal)}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">+ Shipping</span>
                         </div>
                      </div>
                   </div>

                   {/* Promo Code */}
                   <div className="mb-8">
                      {coupon ? (
                         <div className="bg-white border border-green-200 p-3 rounded-sm flex justify-between items-center shadow-sm">
                            <div className="flex items-center text-green-700 text-xs font-bold uppercase tracking-wide">
                               <Icon icon={FiCheck} size={14} className="mr-2" />
                               {coupon.code} Applied
                            </div>
                            <button onClick={() => { removeCoupon(); setCouponMsg(null); }} className="text-slate-300 hover:text-red-500 transition-colors">
                               <Icon icon={FiX} size={16} />
                            </button>
                         </div>
                      ) : (
                         <form onSubmit={handleApplyCoupon} className="relative">
                            <input 
                               type="text" 
                               value={couponCode}
                               onChange={(e) => setCouponCode(e.target.value)}
                               placeholder="Promo Code" 
                               className="w-full bg-white border border-slate-200 p-3 pr-20 text-xs font-bold uppercase tracking-widest outline-none focus:border-slate-900 placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
                            />
                            <button 
                               disabled={isApplying || !couponCode}
                               className="absolute right-1 top-1 bottom-1 bg-slate-900 text-white px-4 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
                            >
                               {isApplying ? '...' : 'Apply'}
                            </button>
                         </form>
                      )}
                      {couponMsg && (
                         <p className={`text-[10px] mt-2 font-bold uppercase tracking-wide ${couponMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                            {couponMsg.text}
                         </p>
                      )}
                   </div>

                   {/* Actions */}
                   <div className="space-y-3">
                      <button 
                         onClick={handleCheckout}
                         disabled={hasOutOfStockItems || isLoading}
                         className="w-full bg-slate-900 text-white py-4 font-bold tracking-[0.2em] uppercase text-xs hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center group"
                      >
                         {isLoading ? 'Updating Cart...' : 'Proceed to Checkout'}
                         {!isLoading && <Icon icon={FiArrowRight} size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />}
                      </button>
                      
                      <a 
                         href={buildWhatsAppUrl(`Hi Ruiz, I need help with my cart containing ${cart.length} items.`)}
                         target="_blank"
                         rel="noreferrer"
                         className="w-full bg-white border border-slate-200 text-slate-900 py-4 font-bold tracking-[0.2em] uppercase text-xs hover:bg-slate-50 transition-all flex items-center justify-center"
                      >
                         <Icon icon={FaWhatsapp} size={16} className="mr-2" />
                         Need Help?
                      </a>
                   </div>

                   {/* Delivery Promise */}
                   <div className="mt-8 pt-8 border-t border-slate-200 space-y-3">
                      <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                         <Icon icon={FiShield} size={14} className="mr-3 text-slate-900" />
                         Secure Checkout
                      </div>
                      <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                         <Icon icon={FiLock} size={14} className="mr-3 text-slate-900" />
                         Cash on Delivery Available
                      </div>
                      <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                         <Icon icon={FiTrash2} size={14} className="mr-3 text-slate-900 opacity-0" /> {/* Spacer */}
                         Dhaka: 12h • Nationwide: 24h
                      </div>
                   </div>

                </div>
             </div>
          </div>
       </div>
    </div>
  );
};