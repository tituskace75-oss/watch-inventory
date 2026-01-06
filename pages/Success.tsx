
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { buildWhatsAppUrl, formatCurrency, formatDate } from '../lib/utils';
import { Icon } from '../components/Icon';
import { FiCheck, FiCopy, FiTruck, FiMapPin, FiPackage, FiArrowRight, FiMessageCircle, FiPhone } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

export const Success: React.FC = () => {
  const { orderId } = useParams(); // This is order_number based on Checkout redirect
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    async function fetchOrder() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items(*),
            history:order_status_history(*)
          `)
          .eq('order_number', orderId)
          .single();

        if (error) throw error;
        setOrder(data);
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  const handleCopyOrderNumber = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleTrackOrder = () => {
    if (order) {
      navigate(`/track-order?order=${order.order_number}&phone=${order.customer_phone}`);
    } else {
      navigate('/track-order');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
           <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto"></div>
           <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Finalizing your order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
        <p className="text-slate-500 mb-8 text-center max-w-md">
          We couldn't locate this order. It might have been placed successfully but not loaded yet.
        </p>
        <div className="flex gap-4">
           <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white border border-slate-200 font-bold uppercase text-xs tracking-widest">Retry</button>
           <Link to="/track-order" className="px-6 py-3 bg-slate-900 text-white font-bold uppercase text-xs tracking-widest">Track Order</Link>
        </div>
      </div>
    );
  }

  const whatsappMessage = `Hi Ruiz, I just placed an order. Order #: ${order.order_number}. Phone: ${order.customer_phone}. Please update me.`;
  const address = order.shipping_address || {};

  return (
    <div className="min-h-screen bg-slate-50 py-12 md:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* HERO CARD */}
        <div className="bg-white p-8 md:p-12 text-center rounded-sm shadow-sm border border-slate-100 mb-8">
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-300">
            <Icon icon={FiCheck} size={40} />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4 text-slate-900">Order Placed Successfully</h1>
          <p className="text-slate-500 mb-8 font-light text-lg">Thank you for choosing Ruiz — Style in every second.</p>
          
          <div className="inline-flex items-center justify-center space-x-3 bg-slate-50 px-6 py-3 rounded-full mb-8 border border-slate-100 group cursor-pointer hover:border-slate-300 transition-colors" onClick={handleCopyOrderNumber}>
            <span className="text-sm text-slate-500 font-medium">Order Number:</span>
            <span className="text-sm font-bold text-slate-900">{order.order_number}</span>
            <Icon icon={FiCopy} size={14} className={`text-slate-400 ${copySuccess ? 'text-green-500' : 'group-hover:text-slate-900'}`} />
            {copySuccess && <span className="text-[10px] text-green-600 font-bold uppercase tracking-widest absolute -bottom-6">Copied</span>}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={handleTrackOrder}
              className="bg-slate-900 text-white px-8 py-4 font-bold tracking-[0.2em] uppercase text-xs hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center"
            >
              Track Order
              <Icon icon={FiArrowRight} className="ml-2" />
            </button>
            <a 
              href={buildWhatsAppUrl(whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              className="bg-white border border-slate-200 text-slate-900 px-8 py-4 font-bold tracking-[0.2em] uppercase text-xs hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-all flex items-center justify-center"
            >
              <Icon icon={FaWhatsapp} className="mr-2" size={16} />
              Chat Support
            </a>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100">
             <div className="flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <Icon icon={FiTruck} className="mr-2 text-slate-900" />
                {address.division === 'Dhaka' ? 'Dhaka: within 12 hours' : 'Outside Dhaka: within 1 day'}
             </div>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
           {/* LEFT: Items & Totals */}
           <div className="md:col-span-2 space-y-8">
              <div className="bg-white rounded-sm border border-slate-100 overflow-hidden">
                 <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900">Items Ordered</h3>
                    <span className="text-xs font-bold text-slate-400">{order.items?.length || 0} Items</span>
                 </div>
                 <div className="p-6 space-y-6">
                    {order.items?.map((item: any) => (
                       <div key={item.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                             <div className="w-12 h-16 bg-slate-100 rounded-sm overflow-hidden flex-shrink-0">
                                <img src={`https://picsum.photos/200/300?seed=${item.variant_id}`} className="w-full h-full object-cover" alt="" />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">SKU: {item.sku}</p>
                                <p className="text-xs text-slate-500 mt-1">Qty: {item.quantity}</p>
                             </div>
                          </div>
                          <p className="text-sm font-bold">{formatCurrency(item.line_total)}</p>
                       </div>
                    ))}
                 </div>
                 <div className="bg-slate-50/50 p-6 border-t border-slate-100 space-y-3">
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
                    <div className="flex justify-between text-base font-bold text-slate-900 pt-3 border-t border-slate-200">
                       <span>Total</span>
                       <span>{formatCurrency(order.total)}</span>
                    </div>
                    <div className="pt-2">
                       <span className="inline-block bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm">
                          Payment: {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}
                       </span>
                    </div>
                 </div>
              </div>
           </div>

           {/* RIGHT: Address & Help */}
           <div className="space-y-8">
              <div className="bg-white p-6 rounded-sm border border-slate-100">
                 <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 mb-4 flex items-center">
                    <Icon icon={FiMapPin} className="mr-2" /> Shipping To
                 </h3>
                 <div className="text-xs text-slate-500 leading-loose">
                    <p className="font-bold text-slate-900 text-sm">{order.customer_name}</p>
                    <p>{address.address}</p>
                    <p>{address.area} {address.thana}</p>
                    <p>{address.district}, {address.division} {address.zip}</p>
                    <p className="text-slate-900 font-medium mt-2">{order.customer_phone}</p>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-sm border border-slate-100">
                 <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 mb-4 flex items-center">
                    <Icon icon={FiMessageCircle} className="mr-2" /> Need Help?
                 </h3>
                 <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Changes to order or delivery address must be requested within 1 hour.
                 </p>
                 <div className="space-y-2">
                    <a href={buildWhatsAppUrl(whatsappMessage)} target="_blank" rel="noreferrer" className="block w-full text-center py-3 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 transition-colors">
                       WhatsApp Us
                    </a>
                    <a href="tel:01571339897" className="block w-full text-center py-3 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 transition-colors">
                       Call 01571339897
                    </a>
                 </div>
              </div>
           </div>
        </div>

        <div className="text-center">
           <Link to="/shop" className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 border-b border-transparent hover:border-slate-900 pb-1 transition-all">
              Continue Shopping
           </Link>
        </div>

      </div>
    </div>
  );
};
