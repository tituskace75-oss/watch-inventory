
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { buildWhatsAppUrl, formatCurrency, formatDate, checkPhoneMatch } from '../lib/utils';
import { Icon } from '../components/Icon';
import { FiSearch, FiTruck, FiPackage, FiMapPin, FiCheckCircle, FiAlertCircle, FiChevronDown, FiChevronUp, FiExternalLink } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

export const TrackOrder: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  // Input State
  const [orderNumInput, setOrderNumInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  
  // Data State
  const [order, setOrder] = useState<any>(null);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Auto-fill and auto-submit if params exist
  useEffect(() => {
    const qOrder = searchParams.get('order');
    const qPhone = searchParams.get('phone');
    
    if (qOrder) setOrderNumInput(qOrder);
    if (qPhone) setPhoneInput(qPhone);

    if (qOrder && qPhone) {
        handleTrack(qOrder, qPhone);
    }
  }, [searchParams]);

  const handleTrack = async (oNum: string, ph: string) => {
    if (!oNum || !ph) {
      setError('Please enter both Order Number and Phone Number.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      // 1. Fetch by Order Number first (Assuming Order Number is unique and indexable)
      // Note: We don't filter by phone in DB query to allow robust client-side normalization check
      // unless RLS restricts this. Assuming public read access or specific RPC is not available,
      // we rely on finding the order ID then verifying phone.
      const { data, error: fetchErr } = await supabase
        .from('orders')
        .select(`
          id, order_number, status, total, subtotal, shipping_fee, discount_total, created_at, customer_phone, payment_method, shipping_address,
          history:order_status_history(*),
          shipment:shipments(*),
          items:order_items(*)
        `)
        .eq('order_number', oNum.trim())
        .single();

      if (fetchErr || !data) {
        throw new Error('Order not found. Please check your order number.');
      }

      // 2. Client-side Phone Verification (Robust)
      if (!checkPhoneMatch(data.customer_phone, ph)) {
        throw new Error('Phone number does not match the order records.');
      }

      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Unable to track order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTrack(orderNumInput, phoneInput);
  };

  // Helper to get latest status
  const currentStatus = order?.history?.[0]?.status || order?.status || 'Unknown';
  const lastUpdated = order?.history?.[0]?.created_at || order?.created_at;

  const STATUS_STEPS = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];
  const getCurrentStepIndex = (status: string) => {
     const s = status.toLowerCase();
     if (s === 'delivered' || s === 'completed') return 4;
     if (s === 'shipped' || s === 'out_for_delivery') return 3;
     if (s === 'packed' || s === 'processing') return 2;
     if (s === 'confirmed') return 1;
     return 0; // pending
  };
  const currentStep = getCurrentStepIndex(currentStatus);

  return (
    <div className="bg-slate-50 min-h-screen py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
           <h1 className="text-4xl font-bold tracking-tighter mb-4">Track Your Order</h1>
           <p className="text-slate-500 font-light">Enter your order number and phone number to see the latest updates.</p>
        </div>

        {/* Input Card */}
        <div className="bg-white p-8 rounded-sm shadow-sm border border-slate-200 mb-12">
           <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Order Number</label>
                 <input 
                   value={orderNumInput}
                   onChange={(e) => setOrderNumInput(e.target.value)}
                   placeholder="e.g. 1045"
                   className="w-full bg-slate-50 border border-slate-200 p-4 text-sm outline-none focus:border-slate-900 rounded-sm font-medium transition-colors"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Phone Number</label>
                 <input 
                   value={phoneInput}
                   onChange={(e) => setPhoneInput(e.target.value)}
                   placeholder="e.g. 01700000000"
                   className="w-full bg-slate-50 border border-slate-200 p-4 text-sm outline-none focus:border-slate-900 rounded-sm font-medium transition-colors"
                 />
              </div>
              <button 
                disabled={loading}
                className="w-full bg-slate-900 text-white p-4 font-bold tracking-[0.2em] uppercase text-xs hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg"
              >
                 {loading ? 'Locating...' : 'Track Order'}
              </button>
           </form>
           {error && (
             <div className="mt-6 flex items-start space-x-3 bg-red-50 p-4 rounded-sm border border-red-100">
                <Icon icon={FiAlertCircle} className="text-red-500 mt-0.5" />
                <p className="text-xs text-red-600 font-medium">{error}</p>
             </div>
           )}
        </div>

        {/* RESULTS SECTION */}
        {order && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             {/* 1. Status Overview */}
             <div className="bg-white p-8 rounded-sm border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                   <div className="flex items-center space-x-3 mb-2">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-2xl font-bold tracking-tighter uppercase">{currentStatus}</span>
                   </div>
                   <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Last Updated: {formatDate(lastUpdated)}</p>
                </div>
                <div className="bg-slate-50 px-6 py-4 rounded-sm border border-slate-100">
                   <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      <Icon icon={FiTruck} className="mr-2" />
                      Estimated Delivery
                   </div>
                   <p className="text-sm font-bold text-slate-900">
                      {order.shipping_address?.division === 'Dhaka' ? 'Within 12 Hours' : 'Within 24 Hours'}
                   </p>
                </div>
             </div>

             {/* 2. Shipment Tracking */}
             {order.shipment && (
               <div className="bg-blue-50/50 p-8 rounded-sm border border-blue-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <Icon icon={FiPackage} size={100} className="text-blue-900" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-900 mb-6">Shipment Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                     <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Courier Service</p>
                        <p className="text-sm font-bold text-slate-900">{order.shipment.courier_name || 'Assigned Soon'}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Tracking Number</p>
                        <p className="text-sm font-bold text-slate-900">{order.shipment.tracking_number || 'Pending'}</p>
                     </div>
                  </div>
                  {order.shipment.tracking_url ? (
                     <a href={order.shipment.tracking_url} target="_blank" rel="noreferrer" className="inline-flex items-center mt-6 bg-blue-600 text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-colors rounded-sm shadow-md">
                        Open Live Tracking <Icon icon={FiExternalLink} className="ml-2" />
                     </a>
                  ) : order.shipment.tracking_number ? (
                     <div className="mt-6 text-xs text-blue-800 font-medium bg-blue-100 inline-block px-4 py-2 rounded-sm">
                        Please check courier website with tracking number.
                     </div>
                  ) : null}
               </div>
             )}

             {/* 3. Timeline */}
             <div className="bg-white p-8 rounded-sm border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 mb-8">Order Progress</h3>
                <div className="relative pl-4 md:pl-0">
                   {/* Vertical Line for Mobile */}
                   <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-slate-100 md:hidden"></div>
                   
                   {/* Desktop Horizontal Stepper */}
                   <div className="hidden md:flex justify-between relative mb-12">
                      <div className="absolute top-[14px] left-0 right-0 h-[2px] bg-slate-100 -z-10"></div>
                      <div className="absolute top-[14px] left-0 h-[2px] bg-slate-900 -z-10 transition-all duration-1000" style={{ width: `${currentStep * 25}%` }}></div>
                      
                      {STATUS_STEPS.map((step, idx) => {
                         const isCompleted = idx <= currentStep;
                         const isCurrent = idx === currentStep;
                         return (
                            <div key={step} className="flex flex-col items-center">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${isCompleted ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-300'}`}>
                                  {isCompleted ? <Icon icon={FiCheckCircle} size={14} /> : <div className="w-2 h-2 rounded-full bg-slate-200"></div>}
                               </div>
                               <span className={`mt-3 text-[10px] font-bold uppercase tracking-widest ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>{step}</span>
                            </div>
                         );
                      })}
                   </div>

                   {/* Detailed History Log */}
                   <div className="space-y-8 md:pl-4 border-l-2 border-slate-100 md:border-none">
                      {order.history && order.history.length > 0 ? (
                         order.history.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((h: any) => (
                           <div key={h.id} className="relative pl-8 md:pl-0 md:flex md:gap-6">
                              <div className="absolute -left-[5px] top-1 w-3 h-3 rounded-full bg-slate-300 border-2 border-white md:hidden"></div>
                              <div className="md:w-32 text-[10px] font-bold uppercase tracking-widest text-slate-400 pt-1 flex-shrink-0">
                                 {formatDate(h.created_at)}
                              </div>
                              <div>
                                 <h4 className="text-sm font-bold text-slate-900 uppercase">{h.status}</h4>
                                 {h.note && <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-3 rounded-sm inline-block">{h.note}</p>}
                              </div>
                           </div>
                         ))
                      ) : (
                         <p className="text-sm text-slate-400 italic">No history available.</p>
                      )}
                   </div>
                </div>
             </div>

             {/* 4. Order Summary (Collapsible) */}
             <div className="bg-white border border-slate-200 rounded-sm shadow-sm">
                <button 
                  onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                >
                   <div className="flex items-center space-x-4">
                      <div className="p-3 bg-slate-100 rounded-full text-slate-500">
                         <Icon icon={FiPackage} />
                      </div>
                      <div className="text-left">
                         <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900">Order Details</h3>
                         <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">{order.items.length} Items • Total: {formatCurrency(order.total)}</p>
                      </div>
                   </div>
                   <Icon icon={isSummaryOpen ? FiChevronUp : FiChevronDown} className="text-slate-400" />
                </button>
                
                {isSummaryOpen && (
                   <div className="px-6 pb-8 border-t border-slate-100">
                      <div className="space-y-4 mt-6">
                         {order.items.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                               <div className="flex items-center space-x-4">
                                  <div className="w-10 h-12 bg-slate-50 rounded-sm overflow-hidden flex-shrink-0">
                                     <img src={`https://picsum.photos/200/300?seed=${item.variant_id}`} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                     <p className="text-xs font-bold text-slate-900">{item.title}</p>
                                     <p className="text-[10px] text-slate-500 uppercase tracking-widest">SKU: {item.sku}</p>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <p className="text-xs font-bold text-slate-900">{formatCurrency(item.line_total)}</p>
                                  <p className="text-[10px] text-slate-400">Qty: {item.quantity}</p>
                               </div>
                            </div>
                         ))}
                      </div>
                      
                      <div className="bg-slate-50 p-4 mt-6 rounded-sm space-y-2">
                         <div className="flex justify-between text-xs text-slate-500"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                         <div className="flex justify-between text-xs text-slate-500"><span>Shipping</span><span>{formatCurrency(order.shipping_fee)}</span></div>
                         {order.discount_total > 0 && <div className="flex justify-between text-xs text-green-600"><span>Discount</span><span>-{formatCurrency(order.discount_total)}</span></div>}
                         <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
                         <div className="text-[10px] text-slate-400 text-right uppercase tracking-widest pt-1">{order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}</div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-slate-100">
                         <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center"><Icon icon={FiMapPin} className="mr-2"/> Shipping Address</h4>
                         <p className="text-xs text-slate-600 leading-relaxed">
                            <span className="font-bold text-slate-900">{order.shipping_address?.customer_name || order.customer_name}</span><br/>
                            {order.shipping_address?.address}<br/>
                            {order.shipping_address?.area}, {order.shipping_address?.thana}<br/>
                            {order.shipping_address?.district} - {order.shipping_address?.zip}
                         </p>
                      </div>
                   </div>
                )}
             </div>

          </div>
        )}

        {/* Support Section */}
        <div className="mt-16 text-center border-t border-slate-200 pt-12">
           <h2 className="text-lg font-bold tracking-tight mb-2">Need help with this order?</h2>
           <p className="text-slate-500 text-xs mb-8">Our support team is available from 10 AM to 10 PM.</p>
           <div className="flex justify-center gap-4">
              <a 
                href={buildWhatsAppUrl(`Hi Ruiz, I need help with order #${orderNumInput}. Phone: ${phoneInput}`)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center bg-[#25D366] text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#20bd5a] transition-all rounded-sm shadow-sm"
              >
                 <Icon icon={FaWhatsapp} className="mr-2" /> Chat on WhatsApp
              </a>
              <a 
                href="tel:01571339897"
                className="flex items-center bg-white border border-slate-200 text-slate-900 px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all rounded-sm"
              >
                 Call Support
              </a>
           </div>
        </div>

      </div>
    </div>
  );
};
