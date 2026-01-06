
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';
import { buildWhatsAppUrl, formatCurrency } from '../lib/utils';
import { FiLock, FiCheck, FiMapPin, FiTruck, FiAlertCircle, FiChevronDown, FiChevronUp, FiTag, FiX } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const DIVISIONS = [
  'Dhaka', 
  'Chattogram', 
  'Rajshahi', 
  'Khulna', 
  'Barishal', 
  'Sylhet', 
  'Rangpur', 
  'Mymensingh'
];

interface ShippingSettings {
  enabled: boolean;
  cod_enabled: boolean;
  zones: {
    zone_key: string;
    name: string;
    fee_bdt: number;
    free_shipping_min_subtotal_bdt: number;
    delivery_eta_text: string;
    cities: string[];
  }[];
  cod_rules: {
    allow_for_all: boolean;
    block_if_order_total_above_bdt: number | null;
  };
}

const DEFAULT_SHIPPING: ShippingSettings = {
  enabled: true,
  cod_enabled: true,
  zones: [
    { zone_key: 'dhaka', name: 'Dhaka City', fee_bdt: 60, free_shipping_min_subtotal_bdt: 5000, delivery_eta_text: 'Within 12 hours', cities: ['Dhaka'] },
    { zone_key: 'outside', name: 'Outside Dhaka', fee_bdt: 120, free_shipping_min_subtotal_bdt: 8000, delivery_eta_text: 'Within 2 days', cities: [] }
  ],
  cod_rules: { allow_for_all: true, block_if_order_total_above_bdt: null }
};

export const Checkout: React.FC = () => {
  const { cart, refreshCart, coupon, applyCoupon, removeCoupon, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    division: 'Dhaka',
    district: '',
    thana: '',
    area: '',
    zip: '',
    notes: '',
    saveAddress: true
  });

  // Shipping Rules State
  const [shippingRules, setShippingRules] = useState<ShippingSettings>(DEFAULT_SHIPPING);
  const [activeZone, setActiveZone] = useState(DEFAULT_SHIPPING.zones[0]);
  const [loadingRules, setLoadingRules] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  // UX State
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Coupon Input State
  const [localCouponCode, setLocalCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Load Shipping Rules
  useEffect(() => {
    async function fetchRules() {
      try {
        const { data } = await supabase.from('site_settings').select('value').eq('key', 'shipping.bd').single();
        if (data) {
          setShippingRules(data.value);
        }
      } catch (e) {
        console.error('Error loading shipping rules', e);
      } finally {
        setLoadingRules(false);
      }
    }
    fetchRules();
  }, []);

  // Recalculate Active Zone when Division/District Changes
  useEffect(() => {
    if (loadingRules) return;
    
    // Simple logic: Check if division matches defined cities (Assuming 'cities' in settings might mean Division for simplicity, or we check against division)
    // If strict city match needed, would need city input. For now, rely on Division.
    const division = formData.division;
    const district = formData.district; // Optional refine

    // Find zone where cities array includes the division OR contains 'Dhaka' and division is 'Dhaka'
    // Default logic: If Division is Dhaka, check 'dhaka' zone. Else 'outside_dhaka'.
    
    let matched = shippingRules.zones.find(z => z.cities.some(c => c.toLowerCase() === division.toLowerCase()));
    
    if (!matched) {
      // Fallback logic
      if (division === 'Dhaka') {
        matched = shippingRules.zones.find(z => z.zone_key === 'dhaka') || shippingRules.zones[0];
      } else {
        matched = shippingRules.zones.find(z => z.zone_key === 'outside_dhaka') || shippingRules.zones[1] || shippingRules.zones[0];
      }
    }
    setActiveZone(matched);
  }, [formData.division, shippingRules, loadingRules]);

  // Derived Values
  const cartSubtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  
  // Fee Calculation
  let baseShippingFee = activeZone?.fee_bdt || 0;
  // Apply Free Shipping Threshold
  if (activeZone?.free_shipping_min_subtotal_bdt > 0 && cartSubtotal >= activeZone.free_shipping_min_subtotal_bdt) {
    baseShippingFee = 0;
  }
  
  const discountAmount = React.useMemo(() => {
    if (!coupon) return 0;
    let d = 0;
    if (coupon.discount_type === 'fixed') d = coupon.discount_value;
    else if (coupon.discount_type === 'percentage') {
      d = Math.round((cartSubtotal * coupon.discount_value) / 100);
      if (coupon.max_discount) d = Math.min(d, coupon.max_discount);
    }
    return Math.min(d, cartSubtotal);
  }, [coupon, cartSubtotal]);

  const total = cartSubtotal + baseShippingFee - discountAmount;

  // Effects
  useEffect(() => {
    refreshCart();
    if (user) fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (cart.length === 0) {
      const t = setTimeout(() => {
         if (cart.length === 0) navigate('/cart');
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [cart, navigate]);

  const fetchUserProfile = async () => {
    if (!user) return;
    setLoadingProfile(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      const { data: address } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();

      if (profile || address) {
        setFormData(prev => ({
          ...prev,
          name: address?.full_name || profile?.full_name || prev.name,
          phone: address?.phone || profile?.phone || prev.phone,
          email: profile?.email || user.email || prev.email,
          address: address?.address_line || prev.address,
          division: address?.division || prev.division,
          district: address?.district || prev.district,
          thana: address?.thana || prev.thana,
          zip: address?.zip || prev.zip,
        }));
      }
    } catch (err) {
      console.error('Profile fetch error', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.address.trim()) newErrors.address = 'Address line is required';
    if (!formData.district.trim()) newErrors.district = 'District is required';
    if (!formData.thana.trim()) newErrors.thana = 'Thana/Upazila is required';
    
    const phoneClean = formData.phone.replace(/\D/g, '');
    if (phoneClean.length < 11) newErrors.phone = 'Please enter a valid phone number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localCouponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponMsg(null);
    const res = await applyCoupon(localCouponCode);
    setCouponMsg({ type: res.success ? 'success' : 'error', text: res.message });
    setIsApplyingCoupon(false);
    if (res.success) setLocalCouponCode('');
  };

  const handlePlaceOrder = async () => {
    setGlobalError(null);
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. RE-VALIDATE STOCK & PRICES
      const variantIds = cart.map(item => item.variant_id);
      const { data: variants, error: varError } = await supabase
        .from('product_variants')
        .select('id, price_bdt, stock_qty')
        .in('id', variantIds);

      if (varError || !variants) throw new Error('Could not verify product availability.');

      let verifiedSubtotal = 0;

      for (const item of cart) {
        const variant = variants.find(v => v.id === item.variant_id);
        if (!variant) throw new Error(`Product ${item.title} is no longer available.`);
        if (variant.stock_qty < item.qty) {
          throw new Error(`Insufficient stock for ${item.title}. Only ${variant.stock_qty} left.`);
        }
        verifiedSubtotal += variant.price_bdt * item.qty;
      }

      // 2. RE-VALIDATE COUPON
      let finalDiscount = 0;
      if (coupon) {
         const { data: cData } = await supabase.from('coupons').select('*').eq('code', coupon.code).single();
         if (cData && cData.is_active && verifiedSubtotal >= cData.min_subtotal) {
            if (cData.discount_type === 'fixed') finalDiscount = cData.discount_value;
            else {
              finalDiscount = Math.round((verifiedSubtotal * cData.discount_value) / 100);
              if (cData.max_discount) finalDiscount = Math.min(finalDiscount, cData.max_discount);
            }
         }
         finalDiscount = Math.min(finalDiscount, verifiedSubtotal);
      }

      const finalTotal = verifiedSubtotal + baseShippingFee - finalDiscount;

      // 3. CREATE ORDER
      const noteWithCoupon = coupon 
        ? (formData.notes ? `${formData.notes} | ` : '') + `Coupon: ${coupon.code}`
        : formData.notes;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user?.id || null,
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_email: formData.email || null,
          shipping_address: {
             address: formData.address,
             division: formData.division,
             district: formData.district,
             thana: formData.thana,
             area: formData.area,
             zip: formData.zip
          },
          status: 'confirmed',
          payment_method: 'cod',
          subtotal: verifiedSubtotal,
          shipping_fee: baseShippingFee,
          discount_total: finalDiscount,
          total: finalTotal,
          notes: noteWithCoupon
        })
        .select('id, order_number')
        .single();

      if (orderError || !order) throw orderError;

      // 4. CREATE ORDER ITEMS
      const orderItemsData = cart.map(item => ({
        order_id: order.id,
        variant_id: item.variant_id,
        sku: item.sku,
        title: item.title,
        unit_price: item.price,
        quantity: item.qty,
        line_total: item.price * item.qty
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);
      if (itemsError) throw itemsError;

      // Decrement stock
      for (const item of cart) {
        const { error: rpcError } = await supabase.rpc('decrement_stock', { variant_id: item.variant_id, amount: item.qty });
        if (rpcError) {
             const { data: v } = await supabase.from('product_variants').select('stock_qty').eq('id', item.variant_id).single();
             if (v) {
               await supabase.from('product_variants').update({ stock_qty: Math.max(0, v.stock_qty - item.qty) }).eq('id', item.variant_id);
             }
        }
      }

      // 5. HISTORY & SHIPMENT
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status: 'confirmed',
        note: 'Order placed via COD'
      });
      
      await supabase.from('shipments').insert({
        order_id: order.id,
        status: 'not_assigned'
      });

      // 6. SAVE ADDRESS
      if (user && formData.saveAddress) {
        await supabase.from('addresses').upsert({
           user_id: user.id,
           label: 'Home',
           full_name: formData.name,
           phone: formData.phone,
           address_line: formData.address,
           division: formData.division,
           district: formData.district,
           thana: formData.thana,
           zip: formData.zip,
           is_default: true
        });
      }

      clearCart();
      navigate(`/success/${order.order_number}`);

    } catch (err: any) {
      console.error('Checkout error:', err);
      setGlobalError(err.message || 'An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const whatsappHelp = `Hi Ruiz, I'm checking out. Name: ${formData.name || 'Guest'}, Phone: ${formData.phone || '...'}, Items: ${cart.length}. Please assist.`;

  if (cart.length === 0 && !isSubmitting) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* Mobile Summary Toggle */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-30">
        <button 
          onClick={() => setIsSummaryOpen(!isSummaryOpen)}
          className="flex items-center justify-between w-full text-sm font-bold text-slate-900"
        >
          <div className="flex items-center">
             <span className="mr-2 text-slate-500">{isSummaryOpen ? 'Hide order summary' : 'Show order summary'}</span>
             {isSummaryOpen ? <Icon icon={FiChevronUp} /> : <Icon icon={FiChevronDown} />}
          </div>
          <span className="text-lg">{formatCurrency(total)}</span>
        </button>
      </div>

      {isSummaryOpen && (
        <div className="lg:hidden bg-slate-50 border-b border-slate-200 p-4 animate-in slide-in-from-top-2">
           <div className="space-y-4">
              {cart.map(item => (
                <div key={item.variant_id} className="flex justify-between items-start">
                   <div className="flex items-center space-x-3">
                      <div className="relative w-12 h-16 bg-white border border-slate-200 rounded-sm overflow-hidden">
                         <img src={item.image} className="w-full h-full object-cover" />
                         <span className="absolute -top-1 -right-1 bg-slate-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold">{item.qty}</span>
                      </div>
                      <div>
                         <p className="text-xs font-bold text-slate-900">{item.title}</p>
                         <p className="text-[10px] text-slate-500">{item.model}</p>
                      </div>
                   </div>
                   <p className="text-xs font-bold text-slate-900">{formatCurrency(item.price * item.qty)}</p>
                </div>
              ))}
           </div>
           <div className="mt-4 pt-4 border-t border-slate-200 space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(cartSubtotal)}</span></div>
              <div className="flex justify-between">
                <span>Shipping ({activeZone.name})</span>
                <span>{baseShippingFee === 0 ? 'Free' : formatCurrency(baseShippingFee)}</span>
              </div>
              {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}
           </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        
        {/* LEFT: FORM */}
        <div className="lg:col-span-7 px-4 sm:px-8 py-12 lg:pr-16 bg-white border-r border-slate-100">
          <div className="max-w-xl mx-auto lg:mx-0">
             <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold tracking-tighter">Ruiz Checkout</h1>
                <Link to="/cart" className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900">Return to Cart</Link>
             </div>

             {globalError && (
               <div className="mb-6 p-4 bg-red-50 border border-red-100 flex items-start space-x-3 rounded-sm">
                  <Icon icon={FiAlertCircle} size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-red-600 mb-1">Order Failed</h4>
                    <p className="text-xs text-red-500">{globalError}</p>
                  </div>
               </div>
             )}

             <div className="space-y-8">
                {/* Contact */}
                <section>
                   <h2 className="text-sm font-bold uppercase tracking-widest mb-4">Contact Information</h2>
                   {user && <p className="text-xs text-slate-500 mb-4">Logged in as {user.email}</p>}
                   <div className="space-y-4">
                      <div>
                         <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Full Name</label>
                         <input name="name" value={formData.name} onChange={handleInputChange} className={`w-full bg-slate-50 border p-3 text-sm outline-none focus:border-slate-900 transition-colors rounded-sm ${errors.name ? 'border-red-300' : 'border-slate-100'}`} placeholder="Ex: John Doe" />
                         {errors.name && <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Phone Number</label>
                            <input name="phone" value={formData.phone} onChange={handleInputChange} className={`w-full bg-slate-50 border p-3 text-sm outline-none focus:border-slate-900 transition-colors rounded-sm ${errors.phone ? 'border-red-300' : 'border-slate-100'}`} placeholder="01XXXXXXXXX" />
                            {errors.phone && <p className="text-[10px] text-red-500 mt-1">{errors.phone}</p>}
                         </div>
                         <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Email (Optional)</label>
                            <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-100 p-3 text-sm outline-none focus:border-slate-900 transition-colors rounded-sm" placeholder="For order updates" />
                         </div>
                      </div>
                   </div>
                </section>

                {/* Shipping */}
                <section>
                   <h2 className="text-sm font-bold uppercase tracking-widest mb-4">Shipping Address</h2>
                   <div className="space-y-4">
                      <div>
                         <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Address Line</label>
                         <input name="address" value={formData.address} onChange={handleInputChange} className={`w-full bg-slate-50 border p-3 text-sm outline-none focus:border-slate-900 transition-colors rounded-sm ${errors.address ? 'border-red-300' : 'border-slate-100'}`} placeholder="House No, Road No, Area" />
                         {errors.address && <p className="text-[10px] text-red-500 mt-1">{errors.address}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Division</label>
                            <div className="relative">
                               <select name="division" value={formData.division} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-100 p-3 text-sm outline-none focus:border-slate-900 appearance-none rounded-sm">
                                  {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                               </select>
                               <Icon icon={FiChevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>
                         </div>
                         <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">District</label>
                            <input name="district" value={formData.district} onChange={handleInputChange} className={`w-full bg-slate-50 border p-3 text-sm outline-none focus:border-slate-900 transition-colors rounded-sm ${errors.district ? 'border-red-300' : 'border-slate-100'}`} placeholder="Ex: Dhaka" />
                            {errors.district && <p className="text-[10px] text-red-500 mt-1">{errors.district}</p>}
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Thana / Upazila</label>
                            <input name="thana" value={formData.thana} onChange={handleInputChange} className={`w-full bg-slate-50 border p-3 text-sm outline-none focus:border-slate-900 transition-colors rounded-sm ${errors.thana ? 'border-red-300' : 'border-slate-100'}`} placeholder="Ex: Dhanmondi" />
                            {errors.thana && <p className="text-[10px] text-red-500 mt-1">{errors.thana}</p>}
                         </div>
                         <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Zip / Postal</label>
                            <input name="zip" value={formData.zip} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-100 p-3 text-sm outline-none focus:border-slate-900 transition-colors rounded-sm" placeholder="Optional" />
                         </div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Order Notes</label>
                          <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={2} className="w-full bg-slate-50 border border-slate-100 p-3 text-sm outline-none focus:border-slate-900 transition-colors rounded-sm" placeholder="Delivery instructions..." />
                      </div>
                      
                      {user && (
                        <div className="flex items-center space-x-2 pt-2">
                           <input type="checkbox" id="saveAddress" checked={formData.saveAddress} onChange={(e) => setFormData(prev => ({ ...prev, saveAddress: e.target.checked }))} className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4" />
                           <label htmlFor="saveAddress" className="text-xs text-slate-600 select-none">Save this information for next time</label>
                        </div>
                      )}
                   </div>
                </section>

                {/* Payment */}
                <section>
                   <h2 className="text-sm font-bold uppercase tracking-widest mb-4">Payment Method</h2>
                   {shippingRules.cod_enabled ? (
                     <div className="space-y-3">
                        <label className="flex items-center justify-between p-4 border border-slate-900 bg-slate-50/50 rounded-sm cursor-pointer ring-1 ring-slate-900">
                           <div className="flex items-center space-x-3">
                              <div className="w-4 h-4 rounded-full border-[5px] border-slate-900 bg-white"></div>
                              <span className="text-sm font-bold text-slate-900">Cash on Delivery (COD)</span>
                           </div>
                           <Icon icon={FiTruck} className="text-slate-900" />
                        </label>
                     </div>
                   ) : (
                     <div className="p-4 border border-red-200 bg-red-50 text-red-600 text-sm font-bold rounded-sm">
                       COD is currently disabled. Please contact support.
                     </div>
                   )}
                </section>

                <button 
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting || !shippingRules.enabled}
                  className="lg:hidden w-full bg-slate-900 text-white py-5 font-bold tracking-[0.2em] uppercase text-xs hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl mt-8"
                >
                  {isSubmitting ? 'Processing...' : `Place Order • ${formatCurrency(total)}`}
                </button>
             </div>
          </div>
        </div>

        {/* RIGHT: SUMMARY (Desktop) */}
        <div className="hidden lg:block lg:col-span-5 px-8 py-12 bg-slate-50 border-l border-slate-200">
           <div className="max-w-md mx-auto sticky top-12">
              <h2 className="text-lg font-bold tracking-tight mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                 {cart.map(item => (
                    <div key={item.variant_id} className="flex justify-between items-center group">
                       <div className="flex items-center space-x-4">
                          <div className="relative w-16 h-20 bg-white border border-slate-200 rounded-sm overflow-hidden flex-shrink-0">
                             <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                             <span className="absolute -top-2 -right-2 bg-slate-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm">{item.qty}</span>
                          </div>
                          <div>
                             <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.title}</p>
                             <p className="text-[10px] text-slate-500 uppercase tracking-wide">{item.model}</p>
                             <p className="text-[10px] text-slate-400">SKU: {item.sku}</p>
                          </div>
                       </div>
                       <p className="text-sm font-medium text-slate-900">{formatCurrency(item.price * item.qty)}</p>
                    </div>
                 ))}
              </div>

              <div className="border-t border-slate-200 pt-6 space-y-4">
                 <div className="mb-4">
                    {coupon ? (
                        <div className="flex justify-between items-center bg-green-50 border border-green-100 p-3 rounded-sm">
                           <div className="flex items-center text-green-700 text-xs font-bold uppercase tracking-wide">
                              <Icon icon={FiTag} size={14} className="mr-2" />
                              <span className="truncate max-w-[150px]">{coupon.code}</span>
                           </div>
                           <button onClick={() => { removeCoupon(); setCouponMsg(null); }} className="text-green-400 hover:text-red-500"><Icon icon={FiX} size={14} /></button>
                        </div>
                    ) : (
                        <div className="flex space-x-2">
                           <input placeholder="Promo Code" value={localCouponCode} onChange={(e) => setLocalCouponCode(e.target.value)} className="flex-grow bg-white border border-slate-200 p-3 text-xs uppercase font-bold outline-none focus:border-slate-900 rounded-sm" />
                           <button onClick={handleApplyCoupon} disabled={isApplyingCoupon || !localCouponCode} className="bg-slate-200 text-slate-600 px-4 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-300 disabled:opacity-50 rounded-sm">{isApplyingCoupon ? '...' : 'Apply'}</button>
                        </div>
                    )}
                    {couponMsg && <p className={`text-[10px] mt-2 font-bold uppercase tracking-wide ${couponMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{couponMsg.text}</p>}
                 </div>

                 <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-bold text-slate-900">{formatCurrency(cartSubtotal)}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Shipping ({activeZone.name})</span>
                    <span className="font-bold text-slate-900">
                      {baseShippingFee === 0 ? <span className="text-green-600">FREE</span> : formatCurrency(baseShippingFee)}
                    </span>
                 </div>
                 {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span className="font-bold">-{formatCurrency(discountAmount)}</span></div>
                 )}
                 <div className="flex justify-between items-end border-t border-slate-200 pt-4">
                    <span className="text-base font-bold text-slate-900">Total</span>
                    <div className="text-right">
                       <span className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1 block">BDT</span>
                       <span className="text-2xl font-bold text-slate-900 leading-none">{formatCurrency(total)}</span>
                    </div>
                 </div>
              </div>

              <div className="mt-8 space-y-4">
                 <button 
                   onClick={handlePlaceOrder}
                   disabled={isSubmitting || !shippingRules.enabled}
                   className="w-full bg-slate-900 text-white py-5 font-bold tracking-[0.2em] uppercase text-xs hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl flex items-center justify-center group"
                 >
                   {isSubmitting ? 'Processing Order...' : 'Place Order'}
                   {!isSubmitting && <Icon icon={FiCheck} className="ml-2 group-hover:scale-110 transition-transform" />}
                 </button>
                 <a href={buildWhatsAppUrl(whatsappHelp)} target="_blank" rel="noreferrer" className="block w-full text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-green-600 transition-colors">Need help? Chat on WhatsApp</a>
              </div>
              
              <div className="mt-8 pt-8 border-t border-slate-200 space-y-2">
                 <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <Icon icon={FiTruck} className="mr-2" />
                    Estimated: {activeZone.delivery_eta_text}
                 </div>
                 <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <Icon icon={FiMapPin} className="mr-2" />
                    Deliver to {formData.division}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
