
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { 
  FiSave, FiRefreshCcw, FiTruck, FiGlobe, FiDollarSign, 
  FiPlus, FiTrash2, FiAlertCircle, FiCheck, FiX, FiToggleLeft, FiToggleRight 
} from 'react-icons/fi';

// --- TYPES ---

interface BDShippingSettings {
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
  address_requirements: {
    require_division: boolean;
    require_district: boolean;
    require_upazila_thana: boolean;
    require_area: boolean;
    require_zip: boolean;
  };
  cod_rules: {
    allow_for_all: boolean;
    block_if_order_total_above_bdt: number | null;
    block_zones: string[];
  };
}

interface IntShippingSettings {
  enabled: boolean;
  default_eta_text: string;
  duties_note: string;
  supported_countries: string[];
  rules: {
    country: string;
    currency: string;
    base_fee: number;
    free_shipping_min_subtotal: number;
  }[];
}

interface CurrencySettings {
  enabled: boolean;
  base_currency: string;
  allowed_currencies: string[];
  display_mode: 'auto_by_country' | 'manual';
  exchange_rate_source: 'manual'; // only manual for now
  manual_rates: Record<string, number>;
  rounding: '0dp' | '2dp';
}

// --- DEFAULTS ---

const DEFAULT_BD: BDShippingSettings = {
  enabled: true,
  cod_enabled: true,
  zones: [
    {
      zone_key: "dhaka",
      name: "Dhaka City",
      fee_bdt: 60,
      free_shipping_min_subtotal_bdt: 5000,
      delivery_eta_text: "Within 12 hours",
      cities: ["Dhaka"]
    },
    {
      zone_key: "outside_dhaka",
      name: "Outside Dhaka",
      fee_bdt: 120,
      free_shipping_min_subtotal_bdt: 8000,
      delivery_eta_text: "Within 2 days",
      cities: []
    }
  ],
  address_requirements: {
    require_division: true,
    require_district: true,
    require_upazila_thana: true,
    require_area: true,
    require_zip: false
  },
  cod_rules: {
    allow_for_all: true,
    block_if_order_total_above_bdt: 20000,
    block_zones: []
  }
};

const DEFAULT_INT: IntShippingSettings = {
  enabled: false,
  default_eta_text: "5–12 business days",
  duties_note: "Duties/taxes may apply depending on destination.",
  supported_countries: ["US", "GB", "AE"],
  rules: [
    { country: "US", currency: "USD", base_fee: 25, free_shipping_min_subtotal: 250 }
  ]
};

const DEFAULT_CURRENCY: CurrencySettings = {
  enabled: true,
  base_currency: "BDT",
  allowed_currencies: ["BDT", "USD", "EUR"],
  display_mode: "auto_by_country",
  exchange_rate_source: "manual",
  manual_rates: {
    "USD": 0.0091,
    "EUR": 0.0084,
    "GBP": 0.0072,
    "AED": 0.033
  },
  rounding: "2dp"
};

const EDITABLE_ROLES = ['super_admin', 'order_manager'];

export const AdminShipping: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState<'bd' | 'int' | 'currency'>('bd');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  // Settings Data
  const [bdSettings, setBdSettings] = useState<BDShippingSettings>(DEFAULT_BD);
  const [intSettings, setIntSettings] = useState<IntShippingSettings>(DEFAULT_INT);
  const [currSettings, setCurrSettings] = useState<CurrencySettings>(DEFAULT_CURRENCY);

  // --- INIT ---
  useEffect(() => {
    checkPermissions();
    fetchSettings();
  }, [user]);

  const checkPermissions = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_roles').select('role:roles(name)').eq('user_id', user.id);
    const roles = data?.map((r: any) => r.role?.name) || [];
    setCanEdit(roles.some(r => EDITABLE_ROLES.includes(r)));
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .in('key', ['shipping.bd', 'shipping.international', 'currency.settings']);

      if (data) {
        const bdRow = data.find(r => r.key === 'shipping.bd');
        if (bdRow) setBdSettings({ ...DEFAULT_BD, ...bdRow.value });

        const intRow = data.find(r => r.key === 'shipping.international');
        if (intRow) setIntSettings({ ...DEFAULT_INT, ...intRow.value });

        const currRow = data.find(r => r.key === 'currency.settings');
        if (currRow) setCurrSettings({ ...DEFAULT_CURRENCY, ...currRow.value });
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleSave = async () => {
    if (!canEdit) return alert('Permission denied.');
    setSaving(true);
    try {
      const updates = [
        { key: 'shipping.bd', value: bdSettings, updated_at: new Date().toISOString() },
        { key: 'shipping.international', value: intSettings, updated_at: new Date().toISOString() },
        { key: 'currency.settings', value: currSettings, updated_at: new Date().toISOString() }
      ];

      const { error } = await supabase.from('site_settings').upsert(updates);
      if (error) throw error;
      alert('Settings saved successfully.');
    } catch (err: any) {
      alert(`Error saving: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!canEdit) return;
    if (!window.confirm("Reset all shipping & currency rules to defaults?")) return;
    setBdSettings(DEFAULT_BD);
    setIntSettings(DEFAULT_INT);
    setCurrSettings(DEFAULT_CURRENCY);
  };

  // --- RENDER HELPERS ---

  if (loading) return <div className="p-12 text-center animate-pulse"><div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-4"></div>Loading Rules...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-2">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 sticky top-20 bg-slate-50/95 backdrop-blur z-10 py-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Shipping & Currency</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">
            Manage logistics fees, zones, and exchange rates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleReset} className="p-2 bg-white border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-600 transition-all" title="Reset Defaults">
            <Icon icon={FiRefreshCcw} size={16} />
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving || !canEdit}
            className="flex items-center bg-slate-900 text-white px-6 py-2.5 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 shadow-sm"
          >
            <Icon icon={FiSave} className="mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden mb-8">
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('bd')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'bd' ? 'bg-slate-50 text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Icon icon={FiTruck} className="inline mr-2 mb-0.5"/> Bangladesh Shipping
          </button>
          <button 
            onClick={() => setActiveTab('int')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'int' ? 'bg-slate-50 text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Icon icon={FiGlobe} className="inline mr-2 mb-0.5"/> International
          </button>
          <button 
            onClick={() => setActiveTab('currency')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'currency' ? 'bg-slate-50 text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Icon icon={FiDollarSign} className="inline mr-2 mb-0.5"/> Currency
          </button>
        </div>

        <div className="p-8">
          
          {/* TAB 1: BD SHIPPING */}
          {activeTab === 'bd' && (
            <div className="space-y-10 max-w-4xl">
              
              {/* Main Toggles */}
              <div className="flex gap-8 border-b border-slate-100 pb-8">
                <div className="flex items-center gap-3">
                  <button onClick={() => setBdSettings(s => ({...s, enabled: !s.enabled}))}>
                    <Icon icon={bdSettings.enabled ? FiToggleRight : FiToggleLeft} size={32} className={bdSettings.enabled ? 'text-green-500' : 'text-slate-300'} />
                  </button>
                  <span className="text-sm font-bold text-slate-900">Module Enabled</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setBdSettings(s => ({...s, cod_enabled: !s.cod_enabled}))}>
                    <Icon icon={bdSettings.cod_enabled ? FiToggleRight : FiToggleLeft} size={32} className={bdSettings.cod_enabled ? 'text-green-500' : 'text-slate-300'} />
                  </button>
                  <span className="text-sm font-bold text-slate-900">COD Available</span>
                </div>
              </div>

              {/* Zones */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Shipping Zones</h3>
                  <button 
                    onClick={() => setBdSettings(s => ({...s, zones: [...s.zones, { zone_key: `zone_${Date.now()}`, name: 'New Zone', fee_bdt: 100, free_shipping_min_subtotal_bdt: 0, delivery_eta_text: '3-5 days', cities: [] }] }))}
                    className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:underline"
                  >
                    + Add Zone
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {bdSettings.zones.map((zone, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-sm p-4 relative group">
                      <button 
                        onClick={() => setBdSettings(s => ({...s, zones: s.zones.filter((_, i) => i !== idx)}))}
                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Icon icon={FiTrash2} />
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Zone Name</label>
                          <input 
                            value={zone.name} 
                            onChange={e => {
                              const newZones = [...bdSettings.zones];
                              newZones[idx].name = e.target.value;
                              setBdSettings({...bdSettings, zones: newZones});
                            }}
                            className="w-full bg-white border border-slate-200 p-2 text-sm font-bold rounded-sm outline-none focus:border-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Fee (BDT)</label>
                          <input 
                            type="number"
                            value={zone.fee_bdt} 
                            onChange={e => {
                              const newZones = [...bdSettings.zones];
                              newZones[idx].fee_bdt = parseInt(e.target.value) || 0;
                              setBdSettings({...bdSettings, zones: newZones});
                            }}
                            className="w-full bg-white border border-slate-200 p-2 text-sm font-bold rounded-sm outline-none focus:border-slate-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Free Shipping Threshold</label>
                          <input 
                            type="number"
                            value={zone.free_shipping_min_subtotal_bdt} 
                            onChange={e => {
                              const newZones = [...bdSettings.zones];
                              newZones[idx].free_shipping_min_subtotal_bdt = parseInt(e.target.value) || 0;
                              setBdSettings({...bdSettings, zones: newZones});
                            }}
                            placeholder="0 to disable"
                            className="w-full bg-white border border-slate-200 p-2 text-sm rounded-sm outline-none focus:border-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">ETA Text</label>
                          <input 
                            value={zone.delivery_eta_text} 
                            onChange={e => {
                              const newZones = [...bdSettings.zones];
                              newZones[idx].delivery_eta_text = e.target.value;
                              setBdSettings({...bdSettings, zones: newZones});
                            }}
                            className="w-full bg-white border border-slate-200 p-2 text-sm rounded-sm outline-none focus:border-slate-900"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3">
                         <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Cities (Comma Separated)</label>
                         <input 
                            value={zone.cities.join(', ')} 
                            onChange={e => {
                              const newZones = [...bdSettings.zones];
                              newZones[idx].cities = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                              setBdSettings({...bdSettings, zones: newZones});
                            }}
                            placeholder="e.g. Dhaka, Savar (Leave empty for default zone)"
                            className="w-full bg-white border border-slate-200 p-2 text-xs rounded-sm outline-none focus:border-slate-900"
                          />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* COD Rules */}
              <section className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">COD Restrictions</h3>
                <div className="bg-slate-50 border border-slate-200 rounded-sm p-6">
                   <div className="flex items-center gap-4 mb-4">
                      <input 
                        type="checkbox" 
                        checked={bdSettings.cod_rules.allow_for_all} 
                        onChange={e => setBdSettings(s => ({...s, cod_rules: {...s.cod_rules, allow_for_all: e.target.checked}}))}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span className="text-sm font-medium">Allow COD for all zones by default</span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                         <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Max Order Value for COD</label>
                         <input 
                            type="number"
                            value={bdSettings.cod_rules.block_if_order_total_above_bdt || ''}
                            onChange={e => setBdSettings(s => ({...s, cod_rules: {...s.cod_rules, block_if_order_total_above_bdt: parseInt(e.target.value) || null}}))}
                            placeholder="Unlimited"
                            className="w-full bg-white border border-slate-200 p-2 text-sm rounded-sm outline-none focus:border-slate-900"
                         />
                      </div>
                   </div>
                </div>
              </section>

            </div>
          )}

          {/* TAB 2: INTERNATIONAL */}
          {activeTab === 'int' && (
            <div className="space-y-10 max-w-4xl">
               <div className="flex items-center gap-3 border-b border-slate-100 pb-8">
                  <button onClick={() => setIntSettings(s => ({...s, enabled: !s.enabled}))}>
                    <Icon icon={intSettings.enabled ? FiToggleRight : FiToggleLeft} size={32} className={intSettings.enabled ? 'text-green-500' : 'text-slate-300'} />
                  </button>
                  <span className="text-sm font-bold text-slate-900">Enable International Shipping</span>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                     <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Default ETA</label>
                     <input 
                       value={intSettings.default_eta_text}
                       onChange={e => setIntSettings({...intSettings, default_eta_text: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                     />
                  </div>
                  <div>
                     <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Supported Countries (Codes)</label>
                     <input 
                       value={intSettings.supported_countries.join(', ')}
                       onChange={e => setIntSettings({...intSettings, supported_countries: e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)})}
                       className="w-full bg-slate-50 border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                     />
                  </div>
               </div>

               <div>
                  <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Duties & Taxes Note</label>
                  <textarea 
                    value={intSettings.duties_note}
                    onChange={e => setIntSettings({...intSettings, duties_note: e.target.value})}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                  />
               </div>

               <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Country Rules</h3>
                    <button 
                      onClick={() => setIntSettings(s => ({...s, rules: [...s.rules, { country: 'US', currency: 'USD', base_fee: 30, free_shipping_min_subtotal: 300 }] }))}
                      className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:underline"
                    >
                      + Add Rule
                    </button>
                  </div>
                  <div className="space-y-2">
                     {intSettings.rules.map((rule, idx) => (
                        <div key={idx} className="flex gap-4 items-center bg-slate-50 p-2 rounded-sm border border-slate-200">
                           <input 
                             value={rule.country}
                             onChange={e => {
                               const newRules = [...intSettings.rules];
                               newRules[idx].country = e.target.value.toUpperCase();
                               setIntSettings({...intSettings, rules: newRules});
                             }}
                             className="w-16 p-2 text-xs font-bold text-center border border-slate-200 rounded-sm uppercase"
                             placeholder="US"
                           />
                           <input 
                             value={rule.currency}
                             onChange={e => {
                               const newRules = [...intSettings.rules];
                               newRules[idx].currency = e.target.value.toUpperCase();
                               setIntSettings({...intSettings, rules: newRules});
                             }}
                             className="w-16 p-2 text-xs text-center border border-slate-200 rounded-sm uppercase"
                             placeholder="USD"
                           />
                           <div className="flex items-center gap-2 flex-grow">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Base:</span>
                              <input 
                                type="number"
                                value={rule.base_fee}
                                onChange={e => {
                                  const newRules = [...intSettings.rules];
                                  newRules[idx].base_fee = parseFloat(e.target.value) || 0;
                                  setIntSettings({...intSettings, rules: newRules});
                                }}
                                className="w-20 p-2 text-xs border border-slate-200 rounded-sm"
                              />
                           </div>
                           <div className="flex items-center gap-2 flex-grow">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Free @:</span>
                              <input 
                                type="number"
                                value={rule.free_shipping_min_subtotal}
                                onChange={e => {
                                  const newRules = [...intSettings.rules];
                                  newRules[idx].free_shipping_min_subtotal = parseFloat(e.target.value) || 0;
                                  setIntSettings({...intSettings, rules: newRules});
                                }}
                                className="w-20 p-2 text-xs border border-slate-200 rounded-sm"
                              />
                           </div>
                           <button onClick={() => setIntSettings(s => ({...s, rules: s.rules.filter((_, i) => i !== idx)}))} className="text-slate-400 hover:text-red-500 p-2">
                              <Icon icon={FiTrash2} />
                           </button>
                        </div>
                     ))}
                  </div>
               </section>
            </div>
          )}

          {/* TAB 3: CURRENCY */}
          {activeTab === 'currency' && (
            <div className="space-y-10 max-w-4xl">
               <div className="flex items-center gap-3 border-b border-slate-100 pb-8">
                  <button onClick={() => setCurrSettings(s => ({...s, enabled: !s.enabled}))}>
                    <Icon icon={currSettings.enabled ? FiToggleRight : FiToggleLeft} size={32} className={currSettings.enabled ? 'text-green-500' : 'text-slate-300'} />
                  </button>
                  <span className="text-sm font-bold text-slate-900">Multi-Currency Enabled</span>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                     <label className="text-[9px] font-bold uppercase text-slate-400 block mb-2">Base Currency</label>
                     <div className="p-3 bg-slate-100 border border-slate-200 rounded-sm text-sm font-bold text-slate-500 cursor-not-allowed">
                        {currSettings.base_currency} (Default)
                     </div>
                  </div>
                  <div>
                     <label className="text-[9px] font-bold uppercase text-slate-400 block mb-2">Allowed Currencies</label>
                     <input 
                        value={currSettings.allowed_currencies.join(', ')}
                        onChange={e => setCurrSettings({...currSettings, allowed_currencies: e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)})}
                        className="w-full bg-slate-50 border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900 font-mono uppercase"
                     />
                  </div>
               </div>

               <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Manual Exchange Rates (1 BDT = X)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {currSettings.allowed_currencies.filter(c => c !== 'BDT').map(curr => (
                        <div key={curr} className="bg-slate-50 p-4 rounded-sm border border-slate-200">
                           <label className="text-xs font-bold text-slate-900 block mb-2">{curr}</label>
                           <input 
                             type="number"
                             step="0.0001"
                             value={currSettings.manual_rates[curr] || ''}
                             onChange={e => setCurrSettings({
                               ...currSettings, 
                               manual_rates: { ...currSettings.manual_rates, [curr]: parseFloat(e.target.value) || 0 }
                             })}
                             className="w-full bg-white border border-slate-200 p-2 text-sm font-mono rounded-sm outline-none focus:border-slate-900"
                           />
                        </div>
                     ))}
                  </div>
               </section>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
