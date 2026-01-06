
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';
import { buildWhatsAppUrl, formatCurrency, formatDate } from '../lib/utils';
import { FiArrowLeft, FiCopy, FiTruck, FiMapPin, FiPackage, FiMessageCircle, FiCheck, FiExternalLink, FiClock, FiAlertCircle } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

export const OrderDetails: React.FC = () => {
  const { orderNumber } = useParams();
  const { user } = useAuth();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!user || !orderNumber) return;

    async function fetchOrder() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items(*),
            history:order_status_history(*),
            shipment:shipments(*)
          `)
          .eq('order_number', orderNumber)
          .eq('customer_id', user!.id) // Strict access control
          .single();

        if (error) throw error;
        setOrder(data);
      } catch (err) {
        console.error('Error fetching order details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [user, orderNumber]);

  const handleCopyOrderNumber = () => {
    if (order?.order_number) {
      navigator.clipboard.writeText(order.order_number.toString());
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-32 text-center animate-pulse"><div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-4"></div><p className="text-xs font-bold tracking-widest text-slate-400">LOADING ORDER...</p></div>;
  
  if (!order) return (
    <div className="max-w-7xl mx-auto px-4 py-32 text-center">
       <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6"><Icon icon={FiAlertCircle} size={24} className="text-slate-400"/></div>
       <h1 className="text-xl font-bold mb-2">Order not found</h1>
       <p className="text-slate-500 text-sm mb-6">This order does not exist or does not belong to your account.</p>
       <Link to="/account/orders" className="text-xs font-bold uppercase tracking-widest border-b border-slate-900 pb-1">Back to Orders</Link>
    </div>
  );

  const address = order.shipping_address || {};
  
  // Timeline Logic
  const STATUS_STEPS = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];
  const getCurrentStepIndex = (status: string) => {
     const s = status.toLowerCase();
     if (s === 'delivered' || s === 'completed') return 4;
     if (s === 'shipped' || s === 'out_for_delivery') return 3;
     if (s === 'packed' || s === 'processing') return 2;
     if (s === 'confirmed') return 1;
     return 0; // pending
  };
  const currentStep = getCurrentStepIndex(order.status);
  const isCancelled = order.status.toLowerCase() === 'cancelled';
  const isReturned = order.status.toLowerCase() === 'returned';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      
      {/* Header / Nav */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/account/orders" className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900">
          <Icon icon={FiArrowLeft} className="mr-2" /> All Orders
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
           Placed {formatDate(order.created_at)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: MAIN DETAILS */}
        <div className="lg:col-span-2 space-y-8">
           
           {/* 1. TOP SUMMARY CARD */}
           <div className="bg-white border border-slate-100 rounded-sm p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                 <div>
                    <div className="flex items-center gap-3 mb-1">
                       <h1 className="text-2xl font-bold tracking-tight text-slate-900">Order #{order.order_number}</h1>
                       <button onClick={handleCopyOrderNumber} className="text-slate-400 hover:text-slate-900 transition-colors" title="Copy Order ID">
                          <Icon icon={copySuccess ? FiCheck : FiCopy} size={14} className={copySuccess ? "text-green-500" : ""} />
                       </button>
                    </div>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${isCancelled ? 'bg-red-100 text-red-600' : 'bg-green-50 text-green-700'}`}>
                       {order.status}
                    </div>
                 </div>
                 <div className="flex gap-3">
                    <Link to={`/track-order?order=${order.order_number}&phone=${order.customer_phone}`} className="flex-1 sm:flex-none text-center bg-white border border-slate-200 text-slate-900 px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all rounded-sm">
                       Track Order
                    </Link>
                    <a href={buildWhatsAppUrl(`Hi Ruiz, I need help with Order #${order.order_number}`)} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none flex items-center justify-center bg-[#25D366] text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#20bd5a] transition-all rounded-sm shadow-sm">
                       <Icon icon={FaWhatsapp} className="mr-2" /> Support
                    </a>
                 </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-t border-b border-slate-50">
                 <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total</p>
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(order.total)}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Items</p>
                    <p className="text-sm font-bold text-slate-900">{order.items?.length || 0} Products</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Payment</p>
                    <p className="text-sm font-bold text-slate-900">{order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Last Update</p>
                    <p className="text-sm font-bold text-slate-900">{formatDate(order.history?.[0]?.created_at || order.created_at)}</p>
                 </div>
              </div>
           </div>

           {/* 2. TIMELINE */}
           {!isCancelled && !isReturned && (
             <div className="bg-white border border-slate-100 rounded-sm p-8 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 mb-8">Order Status</h3>
                <div className="relative">
                   {/* Progress Bar Background */}
                   <div className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-slate-100 md:hidden"></div> {/* Mobile Vertical */}
                   <div className="hidden md:block absolute top-[11px] left-0 right-0 h-[2px] bg-slate-100"></div> {/* Desktop Horizontal */}
                   
                   {/* Active Progress */}
                   <div className="hidden md:block absolute top-[11px] left-0 h-[2px] bg-slate-900 transition-all duration-1000" style={{ width: `${currentStep * 25}%` }}></div>

                   <div className="flex flex-col md:flex-row justify-between relative gap-8 md:gap-0">
                      {STATUS_STEPS.map((step, idx) => {
                         const isCompleted = idx <= currentStep;
                         const isCurrent = idx === currentStep;
                         return (
                            <div key={step} className="flex md:flex-col items-center md:text-center relative bg-white md:bg-transparent z-10">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors flex-shrink-0 mr-4 md:mr-0 ${isCompleted ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-300'}`}>
                                  {isCompleted ? <Icon icon={FiCheck} size={14} /> : <div className="w-2 h-2 rounded-full bg-slate-200"></div>}
                               </div>
                               <div className="md:mt-3">
                                  <span className={`block text-[10px] font-bold uppercase tracking-widest ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>{step}</span>
                                  {isCurrent && <span className="hidden md:block text-[9px] text-slate-400 mt-1">Current Status</span>}
                               </div>
                            </div>
                         );
                      })}
                   </div>
                </div>
             </div>
           )}

           {/* 3. ITEMS LIST */}
           <div className="bg-white border border-slate-100 rounded-sm overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                 <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900">Items Ordered</h3>
              </div>
              <div className="p-6 divide-y divide-slate-100">
                 {order.items?.map((item: any) => (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between group">
                       <div className="flex items-center gap-4">
                          <div className="w-16 h-20 bg-slate-50 rounded-sm overflow-hidden flex-shrink-0 border border-slate-100">
                             {/* Placeholder image logic, ideally fetched via join */}
                             <img src={`https://picsum.photos/200/300?seed=${item.variant_id}`} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div>
                             <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                             <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">SKU: {item.sku}</p>
                             <p className="text-xs text-slate-500 mt-1">Qty: {item.quantity} × {formatCurrency(item.unit_price)}</p>
                          </div>
                       </div>
                       <div className="text-right font-bold text-sm text-slate-900">
                          {formatCurrency(item.line_total)}
                       </div>
                    </div>
                 ))}
              </div>
              
              {/* Totals Section */}
              <div className="bg-slate-50 p-6 space-y-3 border-t border-slate-100">
                 <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                 </div>
                 <div className="flex justify-between text-xs text-slate-500">
                    <span>Shipping</span>
                    <span>{formatCurrency(order.shipping_fee)}</span>
                 </div>
                 {order.discount_total > 0 && (
                    <div className="flex justify-between text-xs text-green-600 font-bold">
                       <span>Discount</span>
                       <span>-{formatCurrency(order.discount_total)}</span>
                    </div>
                 )}
                 <div className="flex justify-between text-base font-bold text-slate-900 pt-3 border-t border-slate-200 mt-3">
                    <span>Grand Total</span>
                    <span>{formatCurrency(order.total)}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* RIGHT COLUMN: SIDEBAR */}
        <div className="lg:col-span-1 space-y-8">
           
           {/* SHIPMENT CARD */}
           <div className="bg-blue-50 border border-blue-100 rounded-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                 <Icon icon={FiPackage} size={80} className="text-blue-900" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-900 mb-4 flex items-center z-10 relative">
                 <Icon icon={FiTruck} className="mr-2"/> Shipment Info
              </h3>
              
              {order.shipment ? (
                 <div className="relative z-10 space-y-4">
                    <div>
                       <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Carrier</p>
                       <p className="font-bold text-slate-900 text-sm">{order.shipment.courier_name || 'Assigned Soon'}</p>
                    </div>
                    <div>
                       <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Tracking Number</p>
                       <p className="font-bold text-slate-900 text-sm tracking-wide">{order.shipment.tracking_number || 'Pending'}</p>
                    </div>
                    {order.shipment.tracking_url && (
                       <a href={order.shipment.tracking_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-800 border-b border-blue-200 hover:border-blue-800 pb-0.5 transition-all">
                          Live Tracking <Icon icon={FiExternalLink} className="ml-1" size={10} />
                       </a>
                    )}
                 </div>
              ) : (
                 <div className="relative z-10">
                    <p className="text-sm text-blue-800 font-medium">Shipment details will appear here once your order is packed.</p>
                 </div>
              )}
           </div>

           {/* DELIVERY ADDRESS */}
           <div className="bg-white border border-slate-100 rounded-sm p-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 mb-4 flex items-center">
                 <Icon icon={FiMapPin} className="mr-2 text-slate-400"/> Delivery Address
              </h3>
              <div className="text-sm text-slate-600 leading-relaxed">
                 <p className="font-bold text-slate-900 mb-1">{order.customer_name}</p>
                 <p>{address.address}</p>
                 <p>{address.area} {address.thana}</p>
                 <p>{address.district}, {address.division} {address.zip}</p>
                 <div className="mt-4 pt-4 border-t border-slate-50 flex items-center text-xs font-bold text-slate-500">
                    <Icon icon={FiMessageCircle} className="mr-2" /> {order.customer_phone}
                 </div>
              </div>
           </div>

           {/* HELP CARD */}
           <div className="bg-slate-50 border border-slate-100 rounded-sm p-6 text-center">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 mb-4">Need Help?</h3>
              <p className="text-xs text-slate-500 mb-6 font-light">
                 Issues with your order? Our support team is here to help you.
              </p>
              <a 
                 href={buildWhatsAppUrl(`Hi Ruiz, I need assistance with Order #${order.order_number}.`)} 
                 target="_blank" 
                 rel="noreferrer"
                 className="block w-full bg-white border border-slate-200 text-slate-900 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all rounded-sm"
              >
                 WhatsApp Support
              </a>
           </div>

        </div>

      </div>
    </div>
  );
};
