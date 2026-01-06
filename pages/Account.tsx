
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Profile, Address, Order } from '../types';
import { Icon } from '../components/Icon';
import { FiChevronRight, FiEdit2 } from 'react-icons/fi';

export const Account: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    
    async function fetchData() {
      setLoading(true);
      try {
        const [profileRes, addressesRes, ordersRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', user!.id).single(),
          supabase.from('addresses').select('*').eq('user_id', user!.id),
          supabase.from('orders').select('*').eq('customer_id', user!.id).order('created_at', { ascending: false }).limit(3)
        ]);

        if (profileRes.data) setProfile(profileRes.data);
        if (addressesRes.data) setAddresses(addressesRes.data);
        if (ordersRes.data) setOrders(ordersRes.data);
      } catch (err) {
        console.error('Error fetching account data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profile) return;
    setSaving(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const updates = {
      full_name: formData.get('full_name') as string,
      phone: formData.get('phone') as string,
    };

    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id, email: user.email, ...updates });

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } else {
      setProfile({ ...profile, ...updates });
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-pulse">
        <h2 className="text-xl font-bold tracking-widest text-slate-200">CURATING YOUR SPACE...</h2>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tighter">My Account</h1>
        <p className="text-slate-500 mt-2 uppercase text-[10px] tracking-[0.4em] font-bold">Personal Dashboard</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Profile Section */}
        <div className="lg:col-span-1">
          <div className="bg-slate-50 p-8 rounded-sm border border-slate-100 h-full">
            <h2 className="text-xs font-bold uppercase tracking-[0.3em] mb-8 border-b border-slate-200 pb-4">Personal Profile</h2>
            {message && (
              <div className={`p-4 mb-6 text-[10px] font-bold uppercase tracking-widest border ${message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                {message.text}
              </div>
            )}
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</label>
                <input disabled value={user?.email} className="w-full bg-slate-200 border-none p-4 rounded-sm text-sm font-medium text-slate-500 cursor-not-allowed"/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</label>
                <input name="full_name" defaultValue={profile?.full_name} required className="w-full bg-white border border-slate-200 p-4 rounded-sm text-sm focus:ring-1 focus:ring-slate-900 outline-none"/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
                <input name="phone" defaultValue={profile?.phone} required className="w-full bg-white border border-slate-200 p-4 rounded-sm text-sm focus:ring-1 focus:ring-slate-900 outline-none"/>
              </div>
              <button disabled={saving} className="w-full bg-slate-900 text-white py-4 font-bold tracking-widest uppercase text-xs hover:bg-slate-800 transition-all disabled:opacity-50">
                {saving ? 'Saving...' : 'Update Details'}
              </button>
            </form>
          </div>
        </div>

        {/* Address & Orders */}
        <div className="lg:col-span-2 space-y-12">
          {/* Recent Orders */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs font-bold uppercase tracking-[0.3em]">Recent Orders</h2>
              <Link to="/account/orders" className="text-[10px] font-bold border-b border-slate-900 uppercase">View All Orders</Link>
            </div>
            {orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white border border-slate-100 hover:shadow-sm transition-all rounded-sm group">
                    <div>
                      <h3 className="font-bold text-slate-900">Order #{order.order_number}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Placed on {new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center space-x-8">
                      <div className="text-right">
                        <p className="text-sm font-bold">৳{order.total.toLocaleString()}</p>
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{order.status}</span>
                      </div>
                      <Link to={`/account/orders/${order.order_number}`} className="bg-slate-50 p-2 rounded-full text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <Icon icon={FiChevronRight} size={20} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 py-12 text-center border border-dashed border-slate-200 rounded-sm">
                <p className="text-slate-400 text-xs font-medium mb-4">You haven't placed any orders yet.</p>
                <Link to="/shop" className="text-xs font-bold uppercase tracking-widest border-b border-slate-900">Start Shopping</Link>
              </div>
            )}
          </div>

          {/* Address Book */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs font-bold uppercase tracking-[0.3em]">Address Book</h2>
              <button className="text-[10px] font-bold border-b border-slate-900 uppercase">Add New</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map(address => (
                <div key={address.id} className="p-6 border border-slate-100 bg-white rounded-sm relative group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] bg-slate-900 text-white px-2 py-0.5">{address.label}</span>
                    {address.is_default && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Default</span>}
                  </div>
                  <p className="text-sm font-bold text-slate-900 mb-1">{address.full_name}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {address.address_line}, {address.thana}<br/>
                    {address.district}, {address.division} - {address.zip}
                  </p>
                  <p className="text-xs text-slate-400 mt-2 font-medium">{address.phone}</p>
                  <div className="absolute top-6 right-6 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-slate-400 hover:text-slate-900">
                      <Icon icon={FiEdit2} size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {addresses.length === 0 && (
                <div className="col-span-full bg-slate-50 py-12 text-center border border-dashed border-slate-200 rounded-sm">
                  <p className="text-slate-400 text-xs font-medium mb-4">No addresses saved.</p>
                  <button className="text-xs font-bold uppercase tracking-widest border-b border-slate-900">Add Delivery Address</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
