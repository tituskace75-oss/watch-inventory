
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';
import { FiCheck, FiZap, FiPackage, FiTruck, FiUsers, FiArrowRight } from 'react-icons/fi';

export const Wholesale: React.FC = () => {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      business_name: formData.get('business_name') as string,
      product_type: formData.get('product_type') as string,
      quantity_estimate: formData.get('quantity') as string,
      location: formData.get('location') as string,
      message: formData.get('message') as string,
    };

    const { error } = await supabase.from('wholesale_inquiries').insert(data);
    
    if (error) {
      console.error('Insert error:', error);
      alert('Inquiry could not be sent. Please WhatsApp us directly.');
    } else {
      setSuccess(true);
    }
    setSaving(false);
  };

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-slate-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
           <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400 mb-6 block animate-in fade-in slide-in-from-bottom-2">B2B Solutions</span>
           <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8 leading-tight animate-in fade-in slide-in-from-bottom-4 delay-100">Wholesale & Corporate <br/> Partnerships</h1>
           <p className="text-slate-400 font-light text-lg leading-relaxed max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 delay-200">
             Expand your inventory or reward your team with the finest curation of watches in Bangladesh. Bulk pricing, dedicated account managers, and priority logistics.
           </p>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { title: 'Exclusive Pricing', desc: 'Tier-based discounts up to 30% off retail.', icon: FiZap },
             { title: 'Ready Stock', desc: 'Large inventory ready for immediate dispatch.', icon: FiPackage },
             { title: 'Custom Gifting', desc: 'Logo engraving & premium packaging available.', icon: FiUsers }
           ].map(item => (
             <div key={item.title} className="p-8 bg-white rounded-sm shadow-xl border border-slate-100">
                <div className="w-12 h-12 bg-slate-50 text-slate-900 rounded-full flex items-center justify-center mb-6">
                   <Icon icon={item.icon} size={24} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest mb-3">{item.title}</h3>
                <p className="text-slate-500 text-sm font-light leading-relaxed">{item.desc}</p>
             </div>
           ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
         <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tighter">How It Works</h2>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-slate-100 -z-10"></div>
            {[
               { step: '01', title: 'Inquiry', desc: 'Submit the form below or contact us.' },
               { step: '02', title: 'Quote', desc: 'Receive a custom offer within 4 hours.' },
               { step: '03', title: 'Payment', desc: 'Secure bank transfer or partial COD.' },
               { step: '04', title: 'Delivery', desc: 'Fast shipping to your warehouse.' },
            ].map((s, i) => (
               <div key={i} className="bg-white text-center">
                  <div className="w-16 h-16 mx-auto bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xl mb-6 ring-8 ring-white">
                     {s.step}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-500">{s.desc}</p>
               </div>
            ))}
         </div>
      </section>

      {/* Form Section */}
      <section className="bg-slate-50 border-t border-slate-200 py-24">
         <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white border border-slate-200 shadow-2xl rounded-sm overflow-hidden flex flex-col md:flex-row">
               <div className="md:w-1/3 bg-slate-900 text-white p-12 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                  <div className="relative z-10">
                     <h2 className="text-2xl font-bold tracking-tight mb-6">Let's grow together.</h2>
                     <p className="text-slate-400 text-xs leading-relaxed font-light mb-8">
                       Fill out the form and our B2B team will reach out with a custom quote.
                     </p>
                     <ul className="space-y-4 text-xs text-slate-300">
                        <li className="flex items-center"><Icon icon={FiCheck} className="mr-3 text-green-400" /> GST Invoice Available</li>
                        <li className="flex items-center"><Icon icon={FiCheck} className="mr-3 text-green-400" /> Dedicated Manager</li>
                        <li className="flex items-center"><Icon icon={FiCheck} className="mr-3 text-green-400" /> Sample Requests</li>
                     </ul>
                  </div>
                  <div className="mt-12 relative z-10">
                     <a href="https://wa.me/8801571339897?text=Hi Ruiz, I want a wholesale quote." className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.2em] border-b border-white pb-1 hover:opacity-80 transition-opacity">
                        WhatsApp B2B <Icon icon={FiArrowRight} className="ml-2"/>
                     </a>
                  </div>
               </div>

               <div className="md:w-2/3 p-10 md:p-16">
                  {success ? (
                     <div className="text-center py-10 h-full flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                           <Icon icon={FiCheck} size={32} />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tighter mb-4">Inquiry Submitted</h2>
                        <p className="text-slate-500 font-light">Our wholesale team will contact you soon.</p>
                        <button onClick={() => setSuccess(false)} className="mt-8 text-xs font-bold uppercase tracking-widest text-slate-900 underline">Submit New Inquiry</button>
                     </div>
                  ) : (
                     <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your Name</label>
                           <input required name="name" className="w-full bg-slate-50 border border-slate-100 p-3 text-sm outline-none focus:border-slate-900 transition-colors rounded-sm"/>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
                           <input required name="phone" className="w-full bg-slate-50 border border-slate-100 p-3 text-sm outline-none focus:border-slate-900 transition-colors rounded-sm"/>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Business Name</label>
                           <input required name="business_name" className="w-full bg-slate-50 border border-slate-100 p-3 text-sm outline-none focus:border-slate-900 transition-colors rounded-sm"/>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Est. Quantity</label>
                           <input required name="quantity" placeholder="e.g. 50+ units" className="w-full bg-slate-50 border border-slate-100 p-3 text-sm outline-none focus:border-slate-900 transition-colors rounded-sm"/>
                        </div>
                        <div className="col-span-full space-y-1">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Product Interest</label>
                           <select name="product_type" className="w-full bg-slate-50 border border-slate-100 p-3 text-sm outline-none focus:border-slate-900 transition-colors rounded-sm cursor-pointer">
                              <option>Smartwatches Only</option>
                              <option>Classic Watches Only</option>
                              <option>Both Types</option>
                           </select>
                        </div>
                        <div className="col-span-full space-y-1">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location / Area</label>
                           <input required name="location" className="w-full bg-slate-50 border border-slate-100 p-3 text-sm outline-none focus:border-slate-900 transition-colors rounded-sm"/>
                        </div>
                        <div className="col-span-full space-y-1">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Additional Message</label>
                           <textarea name="message" rows={3} className="w-full bg-slate-50 border border-slate-100 p-3 text-sm outline-none focus:border-slate-900 transition-colors rounded-sm"></textarea>
                        </div>
                        <div className="col-span-full mt-2">
                           <button disabled={saving} className="w-full bg-slate-900 text-white py-4 font-bold tracking-[0.2em] uppercase text-xs hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg">
                              {saving ? 'Processing Inquiry...' : 'Request Wholesale Quote'}
                           </button>
                        </div>
                     </form>
                  )}
               </div>
            </div>
         </div>
      </section>
    </div>
  );
};
