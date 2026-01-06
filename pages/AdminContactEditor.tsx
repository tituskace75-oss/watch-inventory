
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { FiSave, FiLayout, FiPhone, FiMapPin, FiGlobe, FiClock, FiMessageSquare } from 'react-icons/fi';

const DEFAULT_CONTACT_SETTINGS = {
  header: {
    title: "Contact Us",
    subtitle: "Have a question about an order, a product, or just want to say hello? We're here to help."
  },
  contact_info: {
    whatsapp: "8801571339897",
    phone: "01571339897",
    email: "support@ruiz.com.bd",
    hours: "Everyday: 10:00 AM – 10:00 PM"
  },
  address: {
    title: "Dhaka Office",
    line1: "House #XX, Road #XX,",
    line2: "Dhanmondi, Dhaka-1209",
    country: "Bangladesh"
  },
  map_url: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3651.902442430139!2d90.3775!3d23.7508!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755b8b087026b81%3A0x8fa563bbdd5904c2!2sDhanmondi%2C%20Dhaka!5e0!3m2!1sen!2sbd!4v1625634567890!5m2!1sen!2sbd"
};

export const AdminContactEditor: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_CONTACT_SETTINGS);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'page.contact')
        .single();

      if (data?.value) {
        // Merge with defaults to ensure structure exists
        setSettings({ ...DEFAULT_CONTACT_SETTINGS, ...data.value });
      }
    } catch (err) {
      console.error('Error fetching contact settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          key: 'page.contact', 
          value: settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      alert('Contact page settings updated successfully!');
    } catch (err: any) {
      alert(`Error saving: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center animate-pulse">Loading Editor...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 sticky top-20 bg-slate-50/95 backdrop-blur z-10 py-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contact Page Editor</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">
            Manage contact details, locations, and map
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center bg-slate-900 text-white px-6 py-2.5 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 shadow-sm"
          >
            <Icon icon={FiSave} className="mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* Section 1: Page Header */}
        <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center">
            <Icon icon={FiLayout} className="mr-2 text-slate-400" /> Page Header
          </h3>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Page Title</label>
              <input 
                value={settings.header.title}
                onChange={e => setSettings({...settings, header: {...settings.header, title: e.target.value}})}
                className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Subtitle / Description</label>
              <textarea 
                value={settings.header.subtitle}
                onChange={e => setSettings({...settings, header: {...settings.header, subtitle: e.target.value}})}
                rows={2}
                className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Contact Information */}
        <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center">
            <Icon icon={FiPhone} className="mr-2 text-slate-400" /> Contact Channels
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Phone Number</label>
              <input 
                value={settings.contact_info.phone}
                onChange={e => setSettings({...settings, contact_info: {...settings.contact_info, phone: e.target.value}})}
                className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">WhatsApp Number (No +)</label>
              <input 
                value={settings.contact_info.whatsapp}
                onChange={e => setSettings({...settings, contact_info: {...settings.contact_info, whatsapp: e.target.value}})}
                className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                placeholder="e.g. 8801700000000"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Support Email</label>
              <input 
                value={settings.contact_info.email}
                onChange={e => setSettings({...settings, contact_info: {...settings.contact_info, email: e.target.value}})}
                className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center"><Icon icon={FiClock} className="mr-1"/> Operating Hours</label>
              <input 
                value={settings.contact_info.hours}
                onChange={e => setSettings({...settings, contact_info: {...settings.contact_info, hours: e.target.value}})}
                className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
              />
            </div>
          </div>
        </section>

        {/* Section 3: Location */}
        <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center">
            <Icon icon={FiMapPin} className="mr-2 text-slate-400" /> Physical Location
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Location Title</label>
              <input 
                value={settings.address.title}
                onChange={e => setSettings({...settings, address: {...settings.address, title: e.target.value}})}
                className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                placeholder="e.g. Dhaka Office"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Address Line 1</label>
              <input 
                value={settings.address.line1}
                onChange={e => setSettings({...settings, address: {...settings.address, line1: e.target.value}})}
                className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Address Line 2 (City/Zip)</label>
              <input 
                value={settings.address.line2}
                onChange={e => setSettings({...settings, address: {...settings.address, line2: e.target.value}})}
                className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Country</label>
              <input 
                value={settings.address.country}
                onChange={e => setSettings({...settings, address: {...settings.address, country: e.target.value}})}
                className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center"><Icon icon={FiGlobe} className="mr-1"/> Google Maps Embed URL</label>
            <input 
              value={settings.map_url}
              onChange={e => setSettings({...settings, map_url: e.target.value})}
              className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900 font-mono text-xs text-slate-600"
              placeholder="https://www.google.com/maps/embed?..."
            />
            <p className="text-[10px] text-slate-400 mt-2">
              Go to Google Maps -&gt; Share -&gt; Embed a map -&gt; Copy the "src" attribute URL only.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
};
