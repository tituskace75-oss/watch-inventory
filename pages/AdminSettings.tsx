
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { 
  FiSave, FiRefreshCcw, FiLayout, FiType, FiImage, FiGlobe, 
  FiCheck, FiX, FiToggleLeft, FiToggleRight, FiMove, FiSettings,
  FiSmartphone, FiMail, FiMapPin, FiFacebook, FiYoutube, FiInstagram, FiMessageCircle
} from 'react-icons/fi';

// --- TYPES ---

interface StoreIdentity {
  brand_name: string;
  tagline: string;
  support_phone: string;
  whatsapp_phone: string;
  support_email: string;
  social: {
    facebook: string;
    instagram: string;
    tiktok: string;
    youtube: string;
  };
}

interface ThemeSettings {
  accent_color: string;
  radius: 'sm' | 'md' | 'lg';
  container: 'sm' | 'md' | 'lg';
  navbar: 'default' | 'centered';
}

interface HomepageSection {
  id?: string;
  section_key: string;
  title: string;
  subtitle: string;
  content: any;
  is_enabled: boolean;
  sort_order: number;
}

const DEFAULT_IDENTITY: StoreIdentity = {
  brand_name: 'Ruiz',
  tagline: 'Style in every second.',
  support_phone: '01571339897',
  whatsapp_phone: '01571339897',
  support_email: 'support@ruiz.com.bd',
  social: { facebook: '', instagram: '', tiktok: '', youtube: '' }
};

const DEFAULT_THEME: ThemeSettings = {
  accent_color: '#0f172a',
  radius: 'md',
  container: 'lg',
  navbar: 'default'
};

const SECTION_DEFAULTS: Record<string, Partial<HomepageSection>> = {
  hero: { title: 'Hero Section', sort_order: 10, content: { primary_cta: 'Shop Now', secondary_cta: 'Chat on WhatsApp', bullet_points: ['COD Available', 'Fast Delivery'] } },
  trust_strip: { title: 'Trust Badges', sort_order: 20, content: { show_cod: true, show_warranty: true } },
  featured_collections: { title: 'Featured Collections', sort_order: 30, content: { slugs: 'smart-watches, classic-watches, gift-picks' } },
  best_sellers: { title: 'Best Sellers', sort_order: 40, content: { limit: 8 } },
  new_arrivals: { title: 'New Arrivals', sort_order: 50, content: { limit: 8 } },
  value_props: { title: 'Value Props', sort_order: 60, content: {} },
  social_proof: { title: 'Customer Reviews', sort_order: 70, content: { show_rating: true } },
  wholesale_cta: { title: 'Wholesale Banner', sort_order: 80, content: { headline: 'Corporate & Wholesale', cta: 'Request Quote' } },
  blog_preview: { title: 'Journal Preview', sort_order: 90, content: { enabled: true } },
};

const ADMIN_EDIT_ROLES = ['super_admin', 'content_manager'];

export const AdminSettings: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState<'identity' | 'theme' | 'home'>('identity');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  // Data
  const [identity, setIdentity] = useState<StoreIdentity>(DEFAULT_IDENTITY);
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [sections, setSections] = useState<HomepageSection[]>([]);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    checkPermissions();
    fetchSettings();
  }, [user]);

  const checkPermissions = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_roles').select('role:roles(name)').eq('user_id', user.id);
    const roles = data?.map((r: any) => r.role?.name) || [];
    setCanEdit(roles.some(r => ADMIN_EDIT_ROLES.includes(r)));
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // 1. Fetch Site Settings
      const { data: settingsData } = await supabase.from('site_settings').select('*');
      
      if (settingsData) {
        const idRow = settingsData.find(r => r.key === 'store.identity');
        if (idRow) setIdentity({ ...DEFAULT_IDENTITY, ...idRow.value });

        const themeRow = settingsData.find(r => r.key === 'theme.ui');
        if (themeRow) setTheme({ ...DEFAULT_THEME, ...themeRow.value });
      }

      // 2. Fetch Homepage Sections
      const { data: sectionData } = await supabase.from('homepage_sections').select('*').order('sort_order');
      
      // Merge with defaults to ensure all keys exist in UI
      const mergedSections = Object.keys(SECTION_DEFAULTS).map(key => {
        const existing = sectionData?.find(s => s.section_key === key);
        const def = SECTION_DEFAULTS[key];
        return {
          id: existing?.id,
          section_key: key,
          title: existing?.title || def.title || key,
          subtitle: existing?.subtitle || '',
          content: existing?.content || def.content || {},
          is_enabled: existing?.is_enabled ?? true,
          sort_order: existing?.sort_order || def.sort_order || 99
        } as HomepageSection;
      }).sort((a, b) => a.sort_order - b.sort_order);

      setSections(mergedSections);

    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. ACTIONS ---

  const handleSave = async () => {
    if (!canEdit) return alert('Permission denied.');
    setSaving(true);

    try {
      // 1. Save Identity & Theme
      await supabase.from('site_settings').upsert([
        { key: 'store.identity', value: identity, updated_at: new Date().toISOString() },
        { key: 'theme.ui', value: theme, updated_at: new Date().toISOString() }
      ]);

      // 2. Save Homepage Sections
      // Remove 'id' if undefined to let DB handle insertion
      const sectionRows = sections.map(s => ({
        ...(s.id ? { id: s.id } : {}),
        section_key: s.section_key,
        title: s.title,
        subtitle: s.subtitle,
        content: s.content,
        is_enabled: s.is_enabled,
        sort_order: s.sort_order,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('homepage_sections').upsert(sectionRows, { onConflict: 'section_key' });
      if (error) throw error;

      alert('Settings saved successfully!');
      fetchSettings(); // Refresh IDs

    } catch (err: any) {
      console.error('Save error:', err);
      alert(`Error saving: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // --- RENDERERS ---

  if (loading) return <div className="p-12 text-center animate-pulse"><div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-4"></div>Loading Settings...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-2">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 sticky top-20 bg-slate-50/95 backdrop-blur z-10 py-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Site Settings</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">
            Manage identity, theme, and homepage layout
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchSettings} className="p-2 bg-white border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-600 transition-all">
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
            onClick={() => setActiveTab('identity')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'identity' ? 'bg-slate-50 text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Icon icon={FiGlobe} className="inline mr-2 mb-0.5"/> Store Identity
          </button>
          <button 
            onClick={() => setActiveTab('theme')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'theme' ? 'bg-slate-50 text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Icon icon={FiType} className="inline mr-2 mb-0.5"/> Theme & UI
          </button>
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'home' ? 'bg-slate-50 text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Icon icon={FiLayout} className="inline mr-2 mb-0.5"/> Homepage Builder
          </button>
        </div>

        <div className="p-8">
          
          {/* TAB 1: IDENTITY */}
          {activeTab === 'identity' && (
            <div className="space-y-8 max-w-3xl">
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Basic Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Brand Name</label>
                    <input 
                      value={identity.brand_name}
                      onChange={e => setIdentity({...identity, brand_name: e.target.value})}
                      className="w-full border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Tagline</label>
                    <input 
                      value={identity.tagline}
                      onChange={e => setIdentity({...identity, tagline: e.target.value})}
                      className="w-full border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Contact Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center"><Icon icon={FiSmartphone} className="mr-1"/> Support Phone</label>
                    <input 
                      value={identity.support_phone}
                      onChange={e => setIdentity({...identity, support_phone: e.target.value})}
                      className="w-full border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center"><Icon icon={FiMessageCircle} className="mr-1"/> WhatsApp Number</label>
                    <input 
                      value={identity.whatsapp_phone}
                      onChange={e => setIdentity({...identity, whatsapp_phone: e.target.value})}
                      className="w-full border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center"><Icon icon={FiMail} className="mr-1"/> Support Email</label>
                    <input 
                      value={identity.support_email}
                      onChange={e => setIdentity({...identity, support_email: e.target.value})}
                      className="w-full border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Social Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center"><Icon icon={FiFacebook} className="mr-1"/> Facebook URL</label>
                    <input 
                      value={identity.social.facebook}
                      onChange={e => setIdentity({...identity, social: {...identity.social, facebook: e.target.value}})}
                      className="w-full border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center"><Icon icon={FiInstagram} className="mr-1"/> Instagram URL</label>
                    <input 
                      value={identity.social.instagram}
                      onChange={e => setIdentity({...identity, social: {...identity.social, instagram: e.target.value}})}
                      className="w-full border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: THEME */}
          {activeTab === 'theme' && (
            <div className="space-y-8 max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Accent Color</label>
                  <div className="flex gap-3 items-center">
                    <input 
                      type="color"
                      value={theme.accent_color}
                      onChange={e => setTheme({...theme, accent_color: e.target.value})}
                      className="w-10 h-10 border-0 p-0 rounded-sm cursor-pointer"
                    />
                    <input 
                      value={theme.accent_color}
                      onChange={e => setTheme({...theme, accent_color: e.target.value})}
                      className="flex-grow border border-slate-200 p-2 text-sm rounded-sm outline-none focus:border-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Corner Radius</label>
                  <div className="flex bg-slate-50 p-1 rounded-sm border border-slate-200">
                    {(['sm', 'md', 'lg'] as const).map(r => (
                      <button 
                        key={r}
                        onClick={() => setTheme({...theme, radius: r})}
                        className={`flex-1 py-2 text-xs font-bold uppercase rounded-sm transition-all ${theme.radius === r ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Navbar Style</label>
                  <select 
                    value={theme.navbar}
                    onChange={e => setTheme({...theme, navbar: e.target.value as any})}
                    className="w-full border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900 bg-white"
                  >
                    <option value="default">Default (Left Logo)</option>
                    <option value="centered">Centered Logo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Container Width</label>
                  <select 
                    value={theme.container}
                    onChange={e => setTheme({...theme, container: e.target.value as any})}
                    className="w-full border border-slate-200 p-3 text-sm rounded-sm outline-none focus:border-slate-900 bg-white"
                  >
                    <option value="sm">Small (Compact)</option>
                    <option value="md">Medium (Standard)</option>
                    <option value="lg">Large (Wide)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HOMEPAGE BUILDER */}
          {activeTab === 'home' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 mb-6 bg-blue-50 p-3 border border-blue-100 rounded-sm">
                <Icon icon={FiSettings} className="inline mr-2"/>
                Configure the sections displayed on your homepage. Toggle visibility, edit titles, and reorder.
              </p>

              {sections.map((section, index) => (
                <div key={section.section_key} className={`border rounded-sm transition-all duration-300 ${section.is_enabled ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-75'}`}>
                  <div className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                    
                    {/* Toggle & Title */}
                    <div className="flex items-center gap-4 flex-grow">
                      <button 
                        onClick={() => {
                          const newSections = [...sections];
                          newSections[index].is_enabled = !newSections[index].is_enabled;
                          setSections(newSections);
                        }}
                        className={`text-2xl transition-colors ${section.is_enabled ? 'text-green-500' : 'text-slate-300'}`}
                      >
                        <Icon icon={section.is_enabled ? FiToggleRight : FiToggleLeft} />
                      </button>
                      
                      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                          value={section.title}
                          onChange={e => {
                            const newSections = [...sections];
                            newSections[index].title = e.target.value;
                            setSections(newSections);
                          }}
                          className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-900 outline-none text-sm font-bold text-slate-900"
                          placeholder="Section Title"
                        />
                        <input 
                          value={section.subtitle || ''}
                          onChange={e => {
                            const newSections = [...sections];
                            newSections[index].subtitle = e.target.value;
                            setSections(newSections);
                          }}
                          className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-900 outline-none text-xs text-slate-500"
                          placeholder="Subtitle (Optional)"
                        />
                      </div>
                    </div>

                    {/* Order & Config */}
                    <div className="flex items-center gap-4 pl-10 md:pl-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                      <div className="flex items-center gap-2">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Order</label>
                        <input 
                          type="number"
                          value={section.sort_order}
                          onChange={e => {
                            const newSections = [...sections];
                            newSections[index].sort_order = parseInt(e.target.value);
                            setSections(newSections);
                          }}
                          className="w-12 border border-slate-200 p-1 text-xs text-center rounded-sm focus:border-slate-900 outline-none"
                        />
                      </div>
                      
                      {/* Section Specific Fields (Simplified) */}
                      {section.section_key === 'hero' && (
                        <div className="relative group">
                          <button className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600"><Icon icon={FiImage} size={14}/></button>
                          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 p-4 rounded-sm shadow-xl z-20 hidden group-hover:block animate-in fade-in zoom-in-95">
                             <label className="text-[10px] font-bold uppercase mb-1 block">Hero Image URL</label>
                             <input 
                               value={section.content.hero_image_url || ''}
                               onChange={e => {
                                 const newSections = [...sections];
                                 newSections[index].content = {...section.content, hero_image_url: e.target.value};
                                 setSections(newSections);
                               }}
                               className="w-full border p-2 text-xs rounded-sm mb-2"
                             />
                             <label className="text-[10px] font-bold uppercase mb-1 block">CTA Label</label>
                             <input 
                               value={section.content.primary_cta_label || 'Shop Now'}
                               onChange={e => {
                                 const newSections = [...sections];
                                 newSections[index].content = {...section.content, primary_cta_label: e.target.value};
                                 setSections(newSections);
                               }}
                               className="w-full border p-2 text-xs rounded-sm"
                             />
                          </div>
                        </div>
                      )}

                      {section.section_key === 'featured_collections' && (
                        <div className="relative group">
                          <button className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600"><Icon icon={FiSettings} size={14}/></button>
                          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 p-4 rounded-sm shadow-xl z-20 hidden group-hover:block animate-in fade-in zoom-in-95">
                             <label className="text-[10px] font-bold uppercase mb-1 block">Collection Slugs (Comma sep)</label>
                             <textarea 
                               value={section.content.slugs || ''}
                               onChange={e => {
                                 const newSections = [...sections];
                                 newSections[index].content = {...section.content, slugs: e.target.value};
                                 setSections(newSections);
                               }}
                               rows={3}
                               className="w-full border p-2 text-xs rounded-sm"
                             />
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
