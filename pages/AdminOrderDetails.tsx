
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Icon } from '../components/Icon';
import { 
  FiArrowLeft, FiCopy, FiPhone, FiMessageCircle, FiExternalLink, 
  FiTruck, FiMapPin, FiPackage, FiSave, FiClock, FiAlertCircle, 
  FiCheckCircle, FiXCircle, FiEdit3 
} from 'react-icons/fi';

// --- TYPES & ENUMS ---

const ORDER_STATUSES = [
  'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'
];

const SHIPMENT_STATUSES = [
  'not_assigned', 'in_transit', 'delivered', 'exception', 'returned'
];

const EDITABLE_ROLES = ['super_admin', 'order_manager'];

interface OrderDetail {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  status: string;
  payment_method: string;
  subtotal: number;
  discount_total: number;
  shipping_fee: number;
  total: number;
  notes?: string;
  created_at: string;
  shipping_address: {
    address?: string;
    division?: string;
    district?: string;
    thana?: string;
    area?: string;
    zip?: string;
    [key: string]: any;
  };
  items: {
    id: string;
    title: string;
    sku: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
  history: {
    id: string;
    status: string;
    note?: string;
    created_at: string;
  }[];
  shipment?: {
    id: string;
    status: string;
    courier_name?: string;
    tracking_number?: string;
    tracking_url?: string;
    last_event?: string;
    shipped_at?: string;
    delivered_at?: string;
  };
  coupon?: {
    code: string;
  };
}

// --- HELPER: WhatsApp ---
const normalizeToE164 = (phone: string): string => {
  const cleaned = phone.replace(/[^\d+]/g, ''); // keep + and digits
  if (cleaned.startsWith('+')) return cleaned.substring(1); // Remove + for URL
  if (cleaned.startsWith('0')) return `88${cleaned}`; // 017... -> 88017...
  if (cleaned.startsWith('880')) return cleaned;
  if (cleaned.length === 10 && !cleaned.startsWith('0')) return `880${cleaned}`;
  return `880${cleaned}`; // Fallback
};

const buildWhatsAppUrl = (phone: string, message: string) => {
  const e164 = normalizeToE164(phone);
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
};

export const AdminOrderDetails: React.FC = () => {
  const { orderNumber } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Access State
  const [canEdit, setCanEdit] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Data State
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Action State
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingShipment, setSavingShipment] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  // Form State
  const [statusInput, setStatusInput] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [shipmentForm, setShipmentForm] = useState({
    status: 'not_assigned',
    courier_name: '',
    tracking_number: '',
    tracking_url: '',
    last_event: ''
  });

  // --- 1. AUTH & PERMISSIONS ---
  useEffect(() => {
    if (!user) return;
    const checkRoles = async () => {
      const { data } = await supabase.from('user_roles').select('role:roles(name)').eq('user_id', user.id);
      const roles = data?.map((r: any) => r.role?.name) || [];
      
      const hasAdmin = roles.some((r: string) => ['super_admin', 'catalog_manager', 'order_manager', 'content_manager'].includes(r));
      const hasEdit = roles.some((r: string) => EDITABLE_ROLES.includes(r));
      
      setIsAdmin(hasAdmin);
      setCanEdit(hasEdit);

      if (!hasAdmin) {
        // Fallback or deny handled by layout logic mostly, but good to have safety
      }
    };
    checkRoles();
  }, [user]);

  // --- 2. FETCH DATA ---
  useEffect(() => {
    if (orderNumber) fetchOrderData();
  }, [orderNumber]);

  const fetchOrderData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Order with Relations
      // Using maybeSingle() because filtering by unique column
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*),
          history:order_status_history(*),
          shipment:shipments(*),
          coupon:coupons(code)
        `)
        .eq('order_number', parseInt(orderNumber || '0'))
        .single();

      if (error || !data) throw new Error('Order not found');

      // Map single shipment array to object if necessary
      const shipmentData = Array.isArray(data.shipment) ? data.shipment[0] : data.shipment;
      const historyData = data.history ? data.history.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : [];

      setOrder({
        ...data,
        shipment: shipmentData,
        history: historyData
      });

      // Init Forms
      setStatusInput(data.status);
      setOrderNote(data.notes || '');
      if (shipmentData) {
        setShipmentForm({
          status: shipmentData.status || 'not_assigned',
          courier_name: shipmentData.courier_name || '',
          tracking_number: shipmentData.tracking_number || '',
          tracking_url: shipmentData.tracking_url || '',
          last_event: shipmentData.last_event || ''
        });
      }

    } catch (err) {
      console.error('Error fetching order:', err);
      // Optional: Navigate back if critically failed
    } finally {
      setLoading(false);
    }
  };

  // --- 3. ACTIONS ---

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`Copied: ${text}`);
  };

  const updateStatus = async () => {
    if (!order || !canEdit) return;
    if (statusInput === order.status) return; // No change

    // Validation for destructive statuses
    if (['cancelled', 'returned', 'refunded'].includes(statusInput) && !statusNote.trim()) {
      alert(`A note is required when marking as ${statusInput}.`);
      return;
    }

    if (!window.confirm(`Update status from ${order.status} to ${statusInput}?`)) return;

    setSavingStatus(true);
    try {
      // 1. Update Order
      const { error: orderErr } = await supabase
        .from('orders')
        .update({ status: statusInput })
        .eq('id', order.id);
      
      if (orderErr) throw orderErr;

      // 2. Insert History
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status: statusInput,
        note: statusNote || `Status updated to ${statusInput}`
      });

      setStatusNote('');
      await fetchOrderData(); // Refresh UI
      alert('Status updated successfully.');

    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setSavingStatus(false);
    }
  };

  const saveNotes = async () => {
    if (!order || !canEdit) return;
    setSavingNotes(true);
    try {
      await supabase.from('orders').update({ notes: orderNote }).eq('id', order.id);
      alert('Notes saved.');
    } catch (err: any) {
      alert('Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const saveShipment = async () => {
    if (!order || !canEdit) return;
    setSavingShipment(true);
    try {
      const payload = {
        order_id: order.id,
        ...shipmentForm,
        updated_at: new Date().toISOString(),
        // Conditionally set timestamps based on status logic if needed, 
        // typically backend handles this or explicit fields. 
        // For now, we update the main fields.
        ...(shipmentForm.status === 'in_transit' && !order.shipment?.shipped_at ? { shipped_at: new Date().toISOString() } : {}),
        ...(shipmentForm.status === 'delivered' && !order.shipment?.delivered_at ? { delivered_at: new Date().toISOString() } : {})
      };

      const { error } = await supabase.from('shipments').upsert(payload, { onConflict: 'order_id' });
      if (error) throw error;

      await fetchOrderData();
      alert('Shipment details updated.');

    } catch (err: any) {
      alert(`Shipment update failed: ${err.message}`);
    } finally {
      setSavingShipment(false);
    }
  };

  // --- RENDER HELPERS ---

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    let color = 'bg-slate-100 text-slate-600 border-slate-200';
    if (s === 'confirmed') color = 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'packed') color = 'bg-purple-50 text-purple-700 border-purple-200';
    if (s === 'shipped') color = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (s === 'delivered') color = 'bg-green-50 text-green-700 border-green-200';
    if (s === 'cancelled' || s === 'returned') color = 'bg-red-50 text-red-700 border-red-200';
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-widest border ${color}`}>
        {status}
      </span>
    );
  };

  // --- ACCESS DENIED ---
  if (!loading && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6"><Icon icon={FiXCircle} size={32} /></div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-sm text-slate-500 mb-6">You do not have administrative privileges.</p>
        <Link to="/account" className="px-6 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-sm">My Account</Link>
      </div>
    );
  }

  // --- LOADING / NOT FOUND ---
  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-pulse"><p className="text-xs font-bold tracking-widest text-slate-400">LOADING ORDER DATA...</p></div>;
  
  if (!order) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <h1 className="text-xl font-bold mb-4">Order Not Found</h1>
      <Link to="/admin/orders" className="text-xs font-bold uppercase tracking-widest border-b border-slate-900 pb-1">Back to List</Link>
    </div>
  );

  const waMessage = `Hi ${order.customer_name}, this is Ruiz. Your order #${order.order_number} status is ${order.status.toUpperCase()}. Tracking: ${order.shipment?.tracking_url || order.shipment?.tracking_number || 'Pending'}.`;

  return (
    <div className="max-w-7xl mx-auto pb-24 animate-in fade-in duration-300">
      
      {/* A) HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white border border-slate-200 p-6 rounded-sm shadow-sm sticky top-20 z-10">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link to="/admin/orders" className="text-slate-400 hover:text-slate-900"><Icon icon={FiArrowLeft} size={20} /></Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Order #{order.order_number}</h1>
            {getStatusBadge(order.status)}
          </div>
          <p className="text-xs text-slate-500 pl-9">Placed on {formatDate(order.created_at)}</p>
        </div>
        
        <div className="flex flex-wrap gap-3 pl-9 md:pl-0">
          <button onClick={() => handleCopy(String(order.order_number))} className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-50">
            <Icon icon={FiCopy} className="mr-2" /> Copy ID
          </button>
          <a href={`/track-order?order=${order.order_number}&phone=${order.customer_phone}`} target="_blank" rel="noreferrer" className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-50">
            <Icon icon={FiExternalLink} className="mr-2" /> Track
          </a>
          <a href={`tel:${order.customer_phone}`} className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-50">
            <Icon icon={FiPhone} className="mr-2" /> Call
          </a>
          <a href={buildWhatsAppUrl(order.customer_phone, waMessage)} target="_blank" rel="noreferrer" className="flex items-center px-4 py-2 bg-[#25D366] text-white text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-[#20bd5a] shadow-sm">
            <Icon icon={FiMessageCircle} className="mr-2" /> WhatsApp
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN (Details) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* B) SUMMARY GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Card */}
            <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center"><Icon icon={FiAlertCircle} className="mr-2"/> Customer</h3>
              <p className="font-bold text-slate-900 mb-1">{order.customer_name}</p>
              <p className="text-sm text-slate-600 font-mono mb-1">{order.customer_phone}</p>
              <p className="text-sm text-slate-500">{order.customer_email || 'No email'}</p>
            </div>

            {/* Delivery Card */}
            <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center"><Icon icon={FiMapPin} className="mr-2"/> Delivery</h3>
              <div className="text-sm text-slate-600 leading-relaxed">
                <p>{order.shipping_address.address}</p>
                <p>{order.shipping_address.area} {order.shipping_address.thana && `, ${order.shipping_address.thana}`}</p>
                <p>{order.shipping_address.district} {order.shipping_address.division && `, ${order.shipping_address.division}`}</p>
                <p className="font-mono text-xs text-slate-400 mt-1">{order.shipping_address.zip}</p>
              </div>
            </div>

            {/* Payment & Totals Card */}
            <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center"><Icon icon={FiCheckCircle} className="mr-2"/> Payment</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Method</span><span className="font-bold uppercase">{order.payment_method}</span></div>
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(order.discount_total)}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(order.shipping_fee)}</span></div>
                <div className="flex justify-between font-bold text-slate-900 border-t pt-2 mt-2"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
                {order.coupon && <div className="text-[10px] text-slate-400 text-right mt-1">Coupon: {order.coupon.code}</div>}
              </div>
            </div>

            {/* Internal Notes Card */}
            <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center"><Icon icon={FiEdit3} className="mr-2"/> Internal Notes</h3>
                {canEdit && <button onClick={saveNotes} disabled={savingNotes} className="text-[10px] font-bold uppercase text-slate-900 hover:text-blue-600">{savingNotes ? 'Saving...' : 'Save'}</button>}
              </div>
              <textarea 
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                disabled={!canEdit}
                placeholder="Add private staff notes here..."
                className="w-full h-24 p-3 bg-slate-50 border border-slate-100 rounded-sm text-sm focus:border-slate-900 outline-none resize-none"
              />
            </div>
          </div>

          {/* C) ITEMS TABLE */}
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Order Items</h3>
            </div>
            <table className="w-full text-left">
              <thead className="text-[10px] font-bold uppercase text-slate-500 bg-white border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Item</th>
                  <th className="px-6 py-3 text-right">Unit Price</th>
                  <th className="px-6 py-3 text-center">Qty</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {order.items.map(item => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500 font-mono">SKU: {item.sku}</p>
                    </td>
                    <td className="px-6 py-4 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="px-6 py-4 text-center font-bold">{item.quantity}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* RIGHT COLUMN (Actions) */}
        <div className="space-y-8">
          
          {/* D) STATUS MANAGEMENT */}
          <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center">
              <Icon icon={FiCheckCircle} className="mr-2 text-slate-400"/> Update Status
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Status</label>
                <select 
                  value={statusInput} 
                  onChange={(e) => setStatusInput(e.target.value)}
                  disabled={!canEdit}
                  className="w-full bg-slate-50 border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                >
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Status Note (Public)</label>
                <textarea 
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Reason for change..."
                  className="w-full h-20 p-3 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:border-slate-900 outline-none resize-none"
                />
              </div>

              {canEdit && (
                <button 
                  onClick={updateStatus} 
                  disabled={savingStatus || statusInput === order.status}
                  className="w-full bg-slate-900 text-white py-3 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingStatus ? 'Updating...' : 'Update Status'}
                </button>
              )}
            </div>
          </div>

          {/* E) SHIPMENT TRACKING */}
          <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center">
              <Icon icon={FiTruck} className="mr-2 text-slate-400"/> Shipment
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Shipment Status</label>
                <select 
                  value={shipmentForm.status} 
                  onChange={(e) => setShipmentForm({...shipmentForm, status: e.target.value})}
                  disabled={!canEdit}
                  className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-sm outline-none focus:border-slate-900"
                >
                  {SHIPMENT_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Courier Name</label>
                <input 
                  value={shipmentForm.courier_name}
                  onChange={(e) => setShipmentForm({...shipmentForm, courier_name: e.target.value})}
                  disabled={!canEdit}
                  placeholder="e.g. Pathao, Steadfast"
                  className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-sm outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Tracking Number</label>
                <input 
                  value={shipmentForm.tracking_number}
                  onChange={(e) => setShipmentForm({...shipmentForm, tracking_number: e.target.value})}
                  disabled={!canEdit}
                  placeholder="e.g. TRK-123456"
                  className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-sm outline-none focus:border-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Tracking URL</label>
                <div className="flex gap-2">
                  <input 
                    value={shipmentForm.tracking_url}
                    onChange={(e) => setShipmentForm({...shipmentForm, tracking_url: e.target.value})}
                    disabled={!canEdit}
                    placeholder="https://..."
                    className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-sm outline-none focus:border-slate-900"
                  />
                  {shipmentForm.tracking_url && (
                    <a href={shipmentForm.tracking_url} target="_blank" rel="noreferrer" className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-sm">
                      <Icon icon={FiExternalLink} size={16} />
                    </a>
                  )}
                </div>
              </div>

              {canEdit && (
                <button 
                  onClick={saveShipment} 
                  disabled={savingShipment}
                  className="w-full bg-white border border-slate-900 text-slate-900 py-3 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-50 disabled:opacity-50 mt-2 flex items-center justify-center"
                >
                  <Icon icon={FiSave} className="mr-2" /> {savingShipment ? 'Saving...' : 'Save Shipment'}
                </button>
              )}
            </div>
          </div>

          {/* F) TIMELINE */}
          <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center">
              <Icon icon={FiClock} className="mr-2 text-slate-400"/> History
            </h3>
            <div className="relative pl-4 border-l-2 border-slate-100 space-y-6">
              {order.history.length > 0 ? order.history.map(h => (
                <div key={h.id} className="relative pl-6">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 bg-slate-300 rounded-full border-2 border-white"></div>
                  <p className="text-xs font-bold uppercase text-slate-900">{h.status}</p>
                  <p className="text-[10px] text-slate-400 mb-1">{formatDate(h.created_at)}</p>
                  {h.note && <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-sm inline-block">{h.note}</p>}
                </div>
              )) : (
                <div className="relative pl-6">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 bg-slate-300 rounded-full border-2 border-white"></div>
                  <p className="text-xs font-bold uppercase text-slate-900">{order.status}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(order.created_at)}</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
