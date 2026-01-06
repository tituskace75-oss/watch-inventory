
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Icon } from '../components/Icon';
import { 
  FiPlus, FiDownload, FiSearch, FiFilter, FiEdit3, FiCopy, 
  FiToggleLeft, FiToggleRight, FiTrash2, FiX, FiCheck, FiAlertCircle, 
  FiCalendar, FiPercent, FiDollarSign, FiRefreshCcw 
} from 'react-icons/fi';

// --- TYPES (Exact Schema from Prompt) ---

type DiscountType = 'percent' | 'fixed';

interface Coupon {
  id: string;
  code: string;
  discount_type: DiscountType;
  amount: number;
  min_subtotal: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Aggregated
  usage_count?: number; 
}

const ADMIN_ROLES = ['super_admin', 'order_manager'];
const SUPER_ADMIN_ROLE = 'super_admin';

// --- COMPONENTS (Shadcn-like) ---

const Badge: React.FC<{ children: React.ReactNode; variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'success' }> = ({ children, variant = 'default' }) => {
  const styles = {
    default: 'bg-slate-900 text-white border-transparent',
    outline: 'text-slate-900 border-slate-200',
    secondary: 'bg-slate-100 text-slate-900 border-transparent',
    destructive: 'bg-red-50 text-red-600 border-red-100',
    success: 'bg-green-50 text-green-700 border-green-100'
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${styles[variant]}`}>
      {children}
    </span>
  );
};

// --- MAIN PAGE ---

export const AdminCoupons: React.FC = () => {
  const { user } = useAuth();
  
  // Data
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'percent' | 'fixed'>('all');

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: '',
    discount_type: 'fixed',
    amount: 0,
    min_subtotal: 0,
    max_uses: null,
    max_uses_per_user: null,
    starts_at: null,
    ends_at: null,
    is_active: true
  });

  // --- 1. INITIALIZATION ---

  useEffect(() => {
    if (user) {
      fetchRoles();
      fetchCoupons();
    }
  }, [user]);

  const fetchRoles = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_roles').select('role:roles(name)').eq('user_id', user.id);
    const roles = data?.map((r: any) => r.role?.name) || [];
    setUserRoles(roles);
  };

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      // Fetch coupons and join orders to count usage
      const { data, error } = await supabase
        .from('coupons')
        .select(`
          *,
          orders:orders(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include usage_count
      const formatted: Coupon[] = (data || []).map((c: any) => ({
        ...c,
        usage_count: c.orders?.[0]?.count || 0
      }));

      setCoupons(formatted);
    } catch (err) {
      console.error('Error fetching coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. ACTIONS ---

  const handleCreate = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      discount_type: 'fixed',
      amount: 0,
      min_subtotal: 0,
      max_uses: null,
      max_uses_per_user: null,
      starts_at: null,
      ends_at: null,
      is_active: true
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      amount: coupon.amount,
      min_subtotal: coupon.min_subtotal,
      max_uses: coupon.max_uses,
      max_uses_per_user: coupon.max_uses_per_user,
      starts_at: coupon.starts_at ? new Date(coupon.starts_at).toISOString().slice(0, 16) : null,
      ends_at: coupon.ends_at ? new Date(coupon.ends_at).toISOString().slice(0, 16) : null,
      is_active: coupon.is_active
    });
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialogLoading(true);

    try {
      // Validate
      if (!formData.code) throw new Error("Code is required");
      if (formData.amount! <= 0) throw new Error("Amount must be greater than 0");
      if (formData.discount_type === 'percent' && formData.amount! > 100) throw new Error("Percentage cannot exceed 100%");

      const payload = {
        code: formData.code.toUpperCase().replace(/\s+/g, ''),
        discount_type: formData.discount_type,
        amount: formData.amount,
        min_subtotal: formData.min_subtotal || 0,
        max_uses: formData.max_uses || null,
        max_uses_per_user: formData.max_uses_per_user || null,
        starts_at: formData.starts_at || null,
        ends_at: formData.ends_at || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };

      if (editingCoupon) {
        const { error } = await supabase.from('coupons').update(payload).eq('id', editingCoupon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('coupons').insert(payload);
        if (error) throw error;
      }

      await fetchCoupons();
      setIsDialogOpen(false);
    } catch (err: any) {
      alert(`Error saving coupon: ${err.message}`);
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDuplicate = async (coupon: Coupon) => {
    const newCode = `${coupon.code}_COPY_${Math.floor(Math.random() * 1000)}`;
    try {
      const { error } = await supabase.from('coupons').insert({
        ...coupon,
        id: undefined, // Let DB generate
        code: newCode,
        is_active: false, // Draft state
        created_at: undefined,
        updated_at: undefined,
        usage_count: undefined // Not a DB column
      });
      if (error) throw error;
      await fetchCoupons();
    } catch (err: any) {
      alert(`Error duplicating: ${err.message}`);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
      if (error) throw error;
      // Optimistic update
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this coupon? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      setCoupons(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert(`Error deleting: ${err.message}`);
    }
  };

  const handleExport = () => {
    const headers = ['Code', 'Type', 'Amount', 'Min Subtotal', 'Max Uses', 'Starts', 'Ends', 'Active', 'Usage Count'];
    const rows = filteredData.map(c => [
      c.code,
      c.discount_type,
      c.amount,
      c.min_subtotal,
      c.max_uses || 'Unlimited',
      c.starts_at ? formatDate(c.starts_at) : '-',
      c.ends_at ? formatDate(c.ends_at) : '-',
      c.is_active ? 'Yes' : 'No',
      c.usage_count
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coupons_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 3. FILTERING ---

  const filteredData = useMemo(() => {
    return coupons.filter(c => {
      const matchesSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' 
        ? true 
        : statusFilter === 'active' ? c.is_active : !c.is_active;
      const matchesType = typeFilter === 'all' 
        ? true 
        : c.discount_type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [coupons, searchQuery, statusFilter, typeFilter]);

  // --- 4. ACCESS CONTROL ---
  const isSuperAdmin = userRoles.includes(SUPER_ADMIN_ROLE);
  const canEditRoles = userRoles.some(r => ADMIN_ROLES.includes(r));

  if (!canEditRoles && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Icon icon={FiAlertCircle} size={48} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-slate-500">You do not have permission to manage coupons.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Coupons</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">
            Create and manage promo codes • {filteredData.length} entries
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchCoupons} className="p-2 bg-white border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-600 transition-all">
            <Icon icon={FiRefreshCcw} size={16} />
          </button>
          <button onClick={handleExport} className="hidden sm:flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-50 transition-all">
            <Icon icon={FiDownload} className="mr-2" /> Export
          </button>
          <button onClick={handleCreate} className="flex items-center px-5 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-800 transition-all shadow-sm">
            <Icon icon={FiPlus} className="mr-2" /> Create Coupon
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white border border-slate-200 p-4 rounded-sm mb-6 flex flex-col sm:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-grow w-full sm:w-auto">
          <Icon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            placeholder="Search by code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-sm text-sm focus:border-slate-900 outline-none transition-all"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase tracking-wide text-slate-600 outline-none focus:border-slate-900 flex-1 sm:flex-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase tracking-wide text-slate-600 outline-none focus:border-slate-900 flex-1 sm:flex-none"
          >
            <option value="all">All Types</option>
            <option value="percent">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Code</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Discount</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Usage</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Validity</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-1/2"></div></td>
                  </tr>
                ))
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">No coupons found matching filters.</td>
                </tr>
              ) : (
                filteredData.map(coupon => (
                  <tr key={coupon.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm font-bold text-slate-900 bg-slate-100 inline-block px-2 py-1 rounded-sm border border-slate-200">
                        {coupon.code}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{coupon.discount_type}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-900">
                        {coupon.discount_type === 'percent' ? `${coupon.amount}%` : formatCurrency(coupon.amount)}
                      </div>
                      {coupon.min_subtotal > 0 && (
                        <div className="text-[10px] text-slate-500 mt-0.5">Min: {formatCurrency(coupon.min_subtotal)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <span className="font-bold">{coupon.usage_count}</span> used
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Limit: {coupon.max_uses || '∞'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[10px] text-slate-500">
                      {coupon.starts_at && coupon.ends_at ? (
                        <div className="flex flex-col gap-0.5">
                          <span>{formatDate(coupon.starts_at)}</span>
                          <span className="text-slate-300">to</span>
                          <span>{formatDate(coupon.ends_at)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No expiry</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleToggleActive(coupon)}>
                        {coupon.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(coupon)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-all" title="Edit">
                          <Icon icon={FiEdit3} size={14} />
                        </button>
                        <button onClick={() => handleDuplicate(coupon)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-all" title="Duplicate">
                          <Icon icon={FiCopy} size={14} />
                        </button>
                        {isSuperAdmin && (
                          <button onClick={() => handleDelete(coupon.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="Delete">
                            <Icon icon={FiTrash2} size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CREATE/EDIT DIALOG --- */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Configure discount rules and limits.</p>
              </div>
              <button onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-slate-900">
                <Icon icon={FiX} size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Code & Active */}
              <div className="flex gap-4 items-start">
                <div className="flex-grow">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Coupon Code</label>
                  <input 
                    required
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full bg-slate-50 border border-slate-200 p-3 text-sm font-mono uppercase font-bold rounded-sm outline-none focus:border-slate-900"
                    placeholder="e.g. SUMMER2024"
                  />
                </div>
                <div className="flex-shrink-0 pt-6">
                  <label className="flex items-center cursor-pointer select-none">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={formData.is_active}
                        onChange={e => setFormData({...formData, is_active: e.target.checked})}
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.is_active ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="ml-3 text-xs font-bold uppercase tracking-widest text-slate-600">Active</span>
                  </label>
                </div>
              </div>

              {/* Discount Rules */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Type</label>
                  <div className="flex bg-slate-100 p-1 rounded-sm">
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, discount_type: 'percent'})}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${formData.discount_type === 'percent' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                    >
                      Percent
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, discount_type: 'fixed'})}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${formData.discount_type === 'fixed' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                    >
                      Fixed
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Amount</label>
                  <div className="relative">
                    <input 
                      type="number"
                      required
                      min="0"
                      value={formData.amount}
                      onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 p-3 pl-8 text-sm font-bold rounded-sm outline-none focus:border-slate-900"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Icon icon={formData.discount_type === 'percent' ? FiPercent : FiDollarSign} size={14} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Constraints */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Minimum Subtotal</label>
                <input 
                  type="number"
                  min="0"
                  value={formData.min_subtotal}
                  onChange={e => setFormData({...formData, min_subtotal: parseFloat(e.target.value)})}
                  className="w-full bg-slate-50 border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Total Max Uses</label>
                  <input 
                    type="number"
                    min="0"
                    placeholder="Unlimited"
                    value={formData.max_uses || ''}
                    onChange={e => setFormData({...formData, max_uses: e.target.value ? parseInt(e.target.value) : null})}
                    className="w-full bg-slate-50 border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Max Uses Per User</label>
                  <input 
                    type="number"
                    min="0"
                    placeholder="Unlimited"
                    value={formData.max_uses_per_user || ''}
                    onChange={e => setFormData({...formData, max_uses_per_user: e.target.value ? parseInt(e.target.value) : null})}
                    className="w-full bg-slate-50 border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Starts At</label>
                  <input 
                    type="datetime-local"
                    value={formData.starts_at || ''}
                    onChange={e => setFormData({...formData, starts_at: e.target.value || null})}
                    className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-sm outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Ends At</label>
                  <input 
                    type="datetime-local"
                    value={formData.ends_at || ''}
                    onChange={e => setFormData({...formData, ends_at: e.target.value || null})}
                    className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-sm outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Stats Panel (Read Only) */}
              {editingCoupon && editingCoupon.usage_count !== undefined && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-sm flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Performance</span>
                  <span className="text-slate-900">{editingCoupon.usage_count} Total Uses</span>
                </div>
              )}

            </form>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button onClick={() => setIsDialogOpen(false)} className="flex-1 py-3 border border-slate-200 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 rounded-sm">Cancel</button>
              <button 
                onClick={handleSave} 
                disabled={dialogLoading}
                className="flex-1 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 rounded-sm disabled:opacity-50"
              >
                {dialogLoading ? 'Saving...' : 'Save Coupon'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
