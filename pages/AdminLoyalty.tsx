
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Icon } from '../components/Icon';
import { 
  FiSearch, FiDownload, FiRefreshCcw, FiEdit3, FiClock, 
  FiPlus, FiMinus, FiCopy, FiCheck, FiX, FiAward, FiAlertCircle,
  FiUser, FiArrowRight, FiCreditCard, FiSettings, FiFilter
} from 'react-icons/fi';

// --- TYPES ---

interface Profile {
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
}

interface LoyaltyAccount {
  user_id: string;
  points_balance: number;
  updated_at: string;
  profile?: Profile;
}

interface LoyaltyLedgerItem {
  id: string;
  user_id: string;
  points_delta: number;
  reason: string;
  order_id?: string;
  created_at: string;
  profile?: Profile;
  order?: { order_number: number };
}

interface ReferralCode {
  user_id: string;
  code: string;
  created_at: string;
  profile?: Profile;
}

type ReferralStatus = 'pending' | 'qualified' | 'rewarded' | 'void';

interface Referral {
  id: string;
  referrer_user_id: string;
  referee_user_id?: string;
  referee_order_id?: string;
  status: ReferralStatus;
  created_at: string;
  referrer?: Profile;
  referee?: Profile;
  order?: { order_number: number };
}

interface LoyaltyRules {
  referral_reward_points: number;
}

const SUPER_ADMIN_ROLE = 'super_admin';
const DEFAULT_RULES: LoyaltyRules = { referral_reward_points: 100 };

// --- COMPONENTS ---

const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'bg-slate-100 text-slate-700' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${color}`}>
    {children}
  </span>
);

export const AdminLoyalty: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState<'accounts' | 'ledger' | 'codes' | 'referrals'>('accounts');
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [ledger, setLedger] = useState<LoyaltyLedgerItem[]>([]);
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [rules, setRules] = useState<LoyaltyRules>(DEFAULT_RULES);

  // Modals
  const [adjustModal, setAdjustModal] = useState<{
    isOpen: boolean;
    userId: string;
    currentBalance: number;
    points: number;
    type: 'add' | 'subtract';
    reason: string;
    orderNumber?: string;
  }>({
    isOpen: false, userId: '', currentBalance: 0, points: 0, type: 'add', reason: '', orderNumber: ''
  });

  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [tempRules, setTempRules] = useState<LoyaltyRules>(DEFAULT_RULES);

  // --- 1. INITIALIZATION ---

  useEffect(() => {
    checkPermissions();
    fetchRules();
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const checkPermissions = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_roles').select('role:roles(name)').eq('user_id', user.id);
    const roles = data?.map((r: any) => r.role?.name) || [];
    setIsSuperAdmin(roles.includes(SUPER_ADMIN_ROLE));
  };

  const fetchRules = async () => {
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'loyalty.rules').single();
    if (data) {
      setRules(data.value);
      setTempRules(data.value);
    } else if (isSuperAdmin) {
      // Upsert default if missing
      await supabase.from('site_settings').upsert({ key: 'loyalty.rules', value: DEFAULT_RULES });
    }
  };

  // --- 2. DATA FETCHING ---

  // Helper to fetch profile maps manually if joins fail or for complex relations
  const fetchProfilesMap = async (userIds: string[]) => {
    if (userIds.length === 0) return {};
    const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
    if (uniqueIds.length === 0) return {};

    const { data } = await supabase.from('profiles').select('user_id, email, full_name, phone').in('user_id', uniqueIds);
    const map: Record<string, Profile> = {};
    data?.forEach((p: any) => { map[p.user_id] = p; });
    return map;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'accounts') {
        const { data: accData, error } = await supabase
          .from('loyalty_accounts')
          .select('*')
          .order('points_balance', { ascending: false });
        
        if (error) throw error;
        
        // Manual Join Profiles
        const userIds = accData.map((a: any) => a.user_id);
        const profileMap = await fetchProfilesMap(userIds);
        
        const merged = accData.map((a: any) => ({
            ...a,
            profile: profileMap[a.user_id]
        }));
        setAccounts(merged);

      } else if (activeTab === 'ledger') {
        const { data: legData, error } = await supabase
          .from('loyalty_ledger')
          .select(`*, order:orders(order_number)`)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        
        // Manual Join Profiles
        const userIds = legData.map((l: any) => l.user_id);
        const profileMap = await fetchProfilesMap(userIds);
        
        const merged = legData.map((l: any) => ({
            ...l,
            profile: profileMap[l.user_id]
        }));
        setLedger(merged);

      } else if (activeTab === 'codes') {
        const { data: codeData, error } = await supabase
          .from('referral_codes')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Manual Join Profiles
        const userIds = codeData.map((c: any) => c.user_id);
        const profileMap = await fetchProfilesMap(userIds);
        
        const merged = codeData.map((c: any) => ({
            ...c,
            profile: profileMap[c.user_id]
        }));
        setCodes(merged);

      } else if (activeTab === 'referrals') {
        const { data: refData, error } = await supabase
          .from('referrals')
          .select(`*, order:orders(order_number)`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Manual Join Profiles (Referrer and Referee)
        const userIds = [
            ...refData.map((r: any) => r.referrer_user_id),
            ...refData.map((r: any) => r.referee_user_id)
        ].filter(Boolean);
        
        const profileMap = await fetchProfilesMap(userIds);
        
        const merged = refData.map((r: any) => ({
            ...r,
            referrer: profileMap[r.referrer_user_id],
            referee: r.referee_user_id ? profileMap[r.referee_user_id] : null
        }));
        setReferrals(merged);
      }
    } catch (err: any) {
      console.error('Data fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. ACTIONS ---

  const handleAdjustPoints = async () => {
    if (!isSuperAdmin) return;
    const { userId, type, points, reason, orderNumber, currentBalance } = adjustModal;
    
    if (points <= 0) return alert('Points must be positive integer');
    if (!reason.trim()) return alert('Reason is required');

    try {
      // 1. Resolve Order ID
      let orderId = null;
      if (orderNumber) {
        const { data: o } = await supabase.from('orders').select('id').eq('order_number', parseInt(orderNumber)).single();
        if (!o) {
          if (!confirm(`Order #${orderNumber} not found. Continue without linking?`)) return;
        } else {
          orderId = o.id;
        }
      }

      // 2. Calculate Delta
      const delta = type === 'add' ? points : -points;
      const newBalance = currentBalance + delta;

      if (newBalance < 0) {
        return alert('Action blocked: This would result in a negative balance.');
      }

      // 3. Upsert Account (Create if missing)
      const { error: accError } = await supabase
        .from('loyalty_accounts')
        .upsert({ 
          user_id: userId, 
          points_balance: newBalance, 
          updated_at: new Date().toISOString() 
        });
      
      if (accError) throw accError;

      // 4. Insert Ledger
      const { error: legError } = await supabase.from('loyalty_ledger').insert({
        user_id: userId,
        points_delta: delta,
        reason: reason,
        order_id: orderId
      });

      if (legError) throw legError;

      alert('Points adjusted successfully.');
      setAdjustModal({ ...adjustModal, isOpen: false });
      fetchData();

    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRegenerateCode = async (userId: string) => {
    if (!isSuperAdmin || !confirm('Regenerate code? Old code will be invalid.')) return;
    try {
      const newCode = `RUIZ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { error } = await supabase
        .from('referral_codes')
        .update({ code: newCode })
        .eq('user_id', userId);
      
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    }
  };

  const handleUpdateReferralStatus = async (id: string, status: ReferralStatus) => {
    if (!isSuperAdmin) return;
    if (!confirm(`Change status to ${status.toUpperCase()}?`)) return;
    
    try {
      await supabase.from('referrals').update({ status }).eq('id', id);
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRewardReferrer = async (referral: Referral) => {
    if (!isSuperAdmin) return;
    if (referral.status !== 'qualified') return alert('Referral must be "qualified" to reward.');
    
    const rewardPoints = rules.referral_reward_points;
    if (!confirm(`Reward ${rewardPoints} points to referrer?`)) return;

    try {
      // 1. Get current referrer balance
      const { data: acc } = await supabase.from('loyalty_accounts').select('points_balance').eq('user_id', referral.referrer_user_id).single();
      const current = acc?.points_balance || 0;

      // 2. Update Balance
      await supabase.from('loyalty_accounts').upsert({
        user_id: referral.referrer_user_id,
        points_balance: current + rewardPoints,
        updated_at: new Date().toISOString()
      });

      // 3. Ledger Entry
      await supabase.from('loyalty_ledger').insert({
        user_id: referral.referrer_user_id,
        points_delta: rewardPoints,
        reason: 'Referral Reward',
        order_id: referral.referee_order_id || null
      });

      // 4. Update Referral Status
      await supabase.from('referrals').update({ status: 'rewarded' }).eq('id', referral.id);

      alert('Referrer rewarded!');
      fetchData();

    } catch (err: any) {
      alert(`Reward failed: ${err.message}`);
    }
  };

  const handleSaveRules = async () => {
    if (!isSuperAdmin) return;
    try {
      await supabase.from('site_settings').upsert({ key: 'loyalty.rules', value: tempRules });
      setRules(tempRules);
      setRulesModalOpen(false);
    } catch (err) {
      alert('Failed to save rules');
    }
  };

  // --- 4. EXPORT ---

  const handleExport = () => {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (activeTab === 'accounts') {
      headers = ['User ID', 'Name', 'Email', 'Phone', 'Points Balance', 'Updated'];
      rows = accounts.map(a => [a.user_id, a.profile?.full_name, a.profile?.email, a.profile?.phone, a.points_balance, formatDate(a.updated_at)]);
    } else if (activeTab === 'ledger') {
      headers = ['Date', 'User', 'Points', 'Reason', 'Order #'];
      rows = ledger.map(l => [formatDate(l.created_at), l.profile?.email, l.points_delta, l.reason, l.order?.order_number || '']);
    } else if (activeTab === 'codes') {
      headers = ['User', 'Code', 'Created'];
      rows = codes.map(c => [c.profile?.email, c.code, formatDate(c.created_at)]);
    } else {
      headers = ['Date', 'Referrer', 'Referee', 'Order #', 'Status'];
      rows = referrals.map(r => [formatDate(r.created_at), r.referrer?.email, r.referee?.email, r.order?.order_number, r.status]);
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ruiz_loyalty_${activeTab}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- FILTER HELPER ---
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (activeTab === 'accounts') {
      return accounts.filter(a => 
        a.profile?.full_name?.toLowerCase().includes(q) || 
        a.profile?.email?.toLowerCase().includes(q) || 
        a.profile?.phone?.includes(q)
      );
    }
    if (activeTab === 'ledger') {
      return ledger.filter(l => 
        l.profile?.email?.toLowerCase().includes(q) || 
        l.reason?.toLowerCase().includes(q) ||
        (l.order?.order_number || '').toString().includes(q)
      );
    }
    if (activeTab === 'codes') {
      return codes.filter(c => c.code.toLowerCase().includes(q) || c.profile?.email?.toLowerCase().includes(q));
    }
    if (activeTab === 'referrals') {
      return referrals.filter(r => 
        r.referrer?.email?.toLowerCase().includes(q) || 
        r.referee?.email?.toLowerCase().includes(q)
      );
    }
    return [];
  }, [activeTab, searchQuery, accounts, ledger, codes, referrals]);

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 sticky top-20 bg-slate-50/95 backdrop-blur z-10 py-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Loyalty & Referrals</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">
            Manage points, history, and partner programs
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <button onClick={() => setRulesModalOpen(true)} className="p-2 bg-white border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-600">
              <Icon icon={FiSettings} size={16} />
            </button>
          )}
          <button onClick={fetchData} className="p-2 bg-white border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-600 transition-all">
            <Icon icon={FiRefreshCcw} size={16} />
          </button>
          <button onClick={handleExport} className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-50 transition-all">
            <Icon icon={FiDownload} className="mr-2" /> Export
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden mb-8">
        <div className="flex overflow-x-auto border-b border-slate-100">
          {[
            { id: 'accounts', label: 'Loyalty Accounts', icon: FiCreditCard },
            { id: 'ledger', label: 'Loyalty Ledger', icon: FiClock },
            { id: 'codes', label: 'Referral Codes', icon: FiAward },
            { id: 'referrals', label: 'Referral Activity', icon: FiUser },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setSearchQuery(''); }}
              className={`flex items-center px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-50 text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Icon icon={tab.icon} className="mr-2 mb-0.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* TOOLBAR */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="relative max-w-md w-full">
            <Icon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-sm text-sm focus:border-slate-900 outline-none transition-all"
            />
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="overflow-x-auto min-h-[400px]">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
               <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4"></div>
               <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Data...</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  {activeTab === 'accounts' && (
                    <>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Phone</th>
                      <th className="px-6 py-4 text-center">Points Balance</th>
                      <th className="px-6 py-4 text-right">Updated</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </>
                  )}
                  {activeTab === 'ledger' && (
                    <>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4 text-right">Points</th>
                      <th className="px-6 py-4">Reason</th>
                      <th className="px-6 py-4">Order Ref</th>
                    </>
                  )}
                  {activeTab === 'codes' && (
                    <>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Code</th>
                      <th className="px-6 py-4 text-right">Created</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </>
                  )}
                  {activeTab === 'referrals' && (
                    <>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Referrer</th>
                      <th className="px-6 py-4">Referee</th>
                      <th className="px-6 py-4 text-center">Order #</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredList.map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    
                    {/* ACCOUNTS */}
                    {activeTab === 'accounts' && (
                      <>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{item.profile?.full_name}</p>
                          <p className="text-[10px] text-slate-400">{item.profile?.email}</p>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500">{item.profile?.phone}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">{item.points_balance}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-400">{formatDate(item.updated_at)}</td>
                        <td className="px-6 py-4 text-right">
                          {isSuperAdmin && (
                            <button 
                              onClick={() => setAdjustModal({ isOpen: true, userId: item.user_id, currentBalance: item.points_balance, points: 0, type: 'add', reason: '', orderNumber: '' })} 
                              className="p-2 text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-full border border-slate-200 shadow-sm transition-all"
                              title="Adjust Points"
                            >
                              <Icon icon={FiEdit3} size={14} />
                            </button>
                          )}
                        </td>
                      </>
                    )}

                    {/* LEDGER */}
                    {activeTab === 'ledger' && (
                      <>
                        <td className="px-6 py-4 text-slate-500">{formatDate(item.created_at)}</td>
                        <td className="px-6 py-4 font-bold">{item.profile?.email || 'Unknown'}</td>
                        <td className={`px-6 py-4 text-right font-bold ${item.points_delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.points_delta > 0 ? '+' : ''}{item.points_delta}
                        </td>
                        <td className="px-6 py-4">{item.reason}</td>
                        <td className="px-6 py-4 font-mono text-slate-500">{item.order?.order_number ? `#${item.order.order_number}` : '-'}</td>
                      </>
                    )}

                    {/* CODES */}
                    {activeTab === 'codes' && (
                      <>
                        <td className="px-6 py-4">
                          <p className="font-bold">{item.profile?.full_name}</p>
                          <p className="text-[10px] text-slate-400">{item.profile?.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-slate-100 px-2 py-1 rounded-sm border border-slate-200">{item.code}</span>
                            <button onClick={() => navigator.clipboard.writeText(item.code)} className="text-slate-300 hover:text-slate-600"><Icon icon={FiCopy} size={12}/></button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-400">{formatDate(item.created_at)}</td>
                        <td className="px-6 py-4 text-right">
                          {isSuperAdmin && (
                            <button onClick={() => handleRegenerateCode(item.user_id)} className="p-2 text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-full border border-slate-200 shadow-sm" title="Regenerate">
                              <Icon icon={FiRefreshCcw} size={14} />
                            </button>
                          )}
                        </td>
                      </>
                    )}

                    {/* REFERRALS */}
                    {activeTab === 'referrals' && (
                      <>
                        <td className="px-6 py-4 text-slate-500">{formatDate(item.created_at)}</td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{item.referrer?.full_name || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-400">{item.referrer?.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{item.referee?.full_name || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-400">{item.referee?.email}</p>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-slate-500">{item.order?.order_number || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          {item.status === 'rewarded' && <Badge color="bg-green-100 text-green-700">Rewarded</Badge>}
                          {item.status === 'qualified' && <Badge color="bg-blue-100 text-blue-700">Qualified</Badge>}
                          {item.status === 'pending' && <Badge color="bg-orange-100 text-orange-700">Pending</Badge>}
                          {item.status === 'void' && <Badge color="bg-red-50 text-red-600">Void</Badge>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isSuperAdmin && (
                            <div className="flex justify-end gap-2">
                              {item.status === 'qualified' && (
                                <button onClick={() => handleRewardReferrer(item)} className="p-1.5 bg-green-50 text-green-600 rounded-sm hover:bg-green-100 border border-green-200" title="Reward Referrer">
                                  <Icon icon={FiAward} size={14}/>
                                </button>
                              )}
                              <button onClick={() => handleUpdateReferralStatus(item.id, 'void')} className="p-1.5 bg-red-50 text-red-600 rounded-sm hover:bg-red-100 border border-red-200" title="Void">
                                <Icon icon={FiX} size={14}/>
                              </button>
                            </div>
                          )}
                        </td>
                      </>
                    )}

                  </tr>
                ))}
                {filteredList.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No records found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADJUST POINTS MODAL */}
      {adjustModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-sm shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Adjust Loyalty Points</h3>
              <button onClick={() => setAdjustModal({...adjustModal, isOpen: false})}><Icon icon={FiX} /></button>
            </div>

            <div className="space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-sm">
                <button onClick={() => setAdjustModal({...adjustModal, type: 'add'})} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${adjustModal.type === 'add' ? 'bg-white shadow-sm text-green-600' : 'text-slate-500'}`}>Add Points</button>
                <button onClick={() => setAdjustModal({...adjustModal, type: 'subtract'})} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${adjustModal.type === 'subtract' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500'}`}>Subtract Points</button>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Points Amount</label>
                <input 
                  type="number"
                  min="1"
                  value={adjustModal.points}
                  onChange={(e) => setAdjustModal({...adjustModal, points: parseInt(e.target.value) || 0})}
                  className="w-full border border-slate-200 p-3 text-sm font-bold outline-none focus:border-slate-900 rounded-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1 text-right">Current Balance: {adjustModal.currentBalance}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Order Number (Optional)</label>
                <input 
                  placeholder="e.g. 1045"
                  value={adjustModal.orderNumber}
                  onChange={(e) => setAdjustModal({...adjustModal, orderNumber: e.target.value})}
                  className="w-full border border-slate-200 p-3 text-sm outline-none focus:border-slate-900 rounded-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Reason (Required)</label>
                <input 
                  placeholder="e.g. Manual Adjustment / Refund"
                  value={adjustModal.reason}
                  onChange={(e) => setAdjustModal({...adjustModal, reason: e.target.value})}
                  className="w-full border border-slate-200 p-3 text-sm outline-none focus:border-slate-900 rounded-sm"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setAdjustModal({...adjustModal, isOpen: false})} className="flex-1 py-3 border border-slate-200 text-xs font-bold uppercase tracking-widest hover:bg-slate-50">Cancel</button>
              <button onClick={handleAdjustPoints} className="flex-1 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 shadow-lg">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* RULES MODAL */}
      {rulesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-sm shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Loyalty Rules</h3>
              <button onClick={() => setRulesModalOpen(false)}><Icon icon={FiX} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Referral Reward Points</label>
                <input 
                  type="number"
                  min="0"
                  value={tempRules.referral_reward_points}
                  onChange={(e) => setTempRules({...tempRules, referral_reward_points: parseInt(e.target.value) || 0})}
                  className="w-full border border-slate-200 p-3 text-sm font-bold outline-none focus:border-slate-900 rounded-sm"
                />
                <p className="text-[10px] text-slate-400 mt-2">Points awarded to referrer when referee completes a qualified order.</p>
              </div>
            </div>

            <button onClick={handleSaveRules} className="w-full mt-6 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 shadow-lg">Save Rules</button>
          </div>
        </div>
      )}

    </div>
  );
};
