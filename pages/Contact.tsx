
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';
import { FiPhone, FiMapPin, FiCheck, FiMail, FiClock } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const DEFAULT_CONTENT = {
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

export const Contact: React.FC = () => {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [content, setContent] = useState(DEFAULT_CONTENT);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data } = await supabase.from('site_settings').select('value').eq('key', 'page.contact').single();
        if (data?.value) {
          setContent(prev => ({ ...prev, ...data.value }));
        }
      } catch (err) {
        console.error('Error loading contact info', err);
      }
    };
    fetchContent();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      subject: formData.get('subject') as string,
      message: formData.get('message') as string,
    };

    const { error } = await supabase.from('contact_messages').insert(data);
    
    if (error) {
      console.error('Insert error:', error);
      alert('Could not send message. Please try WhatsApp support.');
    } else {
      setSuccess(true);
    }
    setSaving(false);
  };

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-24 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">{content.header.title}</h1>
        <p className="text-slate-400 font-light text-lg max-w-xl mx-auto">
          {content.header.subtitle}
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 -mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Info Cards */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Quick Actions Card */}
            <div className="bg-white p-8 rounded-sm shadow-xl border border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Quick Support</h3>
              <div className="space-y-6">
                <a href={`https://wa.me/${content.contact_info.whatsapp}`} className="flex items-center group">
                  <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mr-4 group-hover:bg-green-100 transition-colors">
                    <Icon icon={FaWhatsapp} size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">WhatsApp Us</p>
                    <p className="text-xs text-slate-500">Fastest response</p>
                  </div>
                </a>
                <a href={`tel:${content.contact_info.phone}`} className="flex items-center group">
                  <div className="w-10 h-10 bg-slate-50 text-slate-900 rounded-full flex items-center justify-center mr-4 group-hover:bg-slate-100 transition-colors">
                    <Icon icon={FiPhone} size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Call Us</p>
                    <p className="text-xs text-slate-500">{content.contact_info.phone}</p>
                  </div>
                </a>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-slate-50 text-slate-900 rounded-full flex items-center justify-center mr-4">
                    <Icon icon={FiMail} size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Email</p>
                    <p className="text-xs text-slate-500">{content.contact_info.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Location & Hours Card */}
            <div className="bg-white p-8 rounded-sm shadow-lg border border-slate-100">
               <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Details</h3>
               <div className="space-y-6">
                  <div className="flex items-start">
                     <Icon icon={FiMapPin} className="mt-1 mr-4 text-slate-400" />
                     <div>
                        <p className="text-sm font-bold text-slate-900 mb-1">{content.address.title}</p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                           {content.address.line1} <br/>
                           {content.address.line2} <br/>
                           {content.address.country}
                        </p>
                     </div>
                  </div>
                  <div className="flex items-start">
                     <Icon icon={FiClock} className="mt-1 mr-4 text-slate-400" />
                     <div>
                        <p className="text-sm font-bold text-slate-900 mb-1">Operating Hours</p>
                        <p className="text-xs text-slate-500">{content.contact_info.hours}</p>
                     </div>
                  </div>
               </div>
            </div>

          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-2">
            <div className="bg-white p-10 md:p-12 rounded-sm shadow-xl border border-slate-100 h-full">
              {success ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6 animate-in zoom-in">
                      <Icon icon={FiCheck} size={40} />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tighter mb-4">Message Sent!</h2>
                    <p className="text-slate-500 font-light max-w-sm mx-auto">
                      Thank you for contacting us. Our support team will get back to you within 24 hours.
                    </p>
                    <button onClick={() => setSuccess(false)} className="mt-8 text-xs font-bold uppercase tracking-widest border-b border-slate-900 pb-1">Send another</button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold tracking-tight mb-8">Send a Message</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your Name</label>
                        <input required name="name" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-sm text-sm outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"/>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
                        <input required name="phone" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-sm text-sm outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"/>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address (Optional)</label>
                      <input name="email" type="email" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-sm text-sm outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Subject</label>
                      <select name="subject" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-sm text-sm outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all cursor-pointer">
                        <option>General Inquiry</option>
                        <option>Order Status</option>
                        <option>Product Support</option>
                        <option>Warranty Claim</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Message</label>
                      <textarea required name="message" rows={5} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-sm text-sm outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all" placeholder="How can we help you?"></textarea>
                    </div>
                    <button disabled={saving} className="w-full bg-slate-900 text-white py-5 font-bold tracking-[0.2em] uppercase text-xs hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg">
                      {saving ? 'Sending...' : 'Submit Message'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

        </div>
        
        {/* Map Placeholder */}
        <div className="mt-20 h-80 bg-slate-100 rounded-sm overflow-hidden relative grayscale hover:grayscale-0 transition-all duration-700">
           <iframe 
             src={content.map_url} 
             width="100%" 
             height="100%" 
             style={{border:0}} 
             loading="lazy"
             title="Ruiz Location"
           ></iframe>
           <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded-sm shadow-md text-xs font-bold text-slate-900">
              Ruiz HQ • {content.address.title.split(' ')[0]}
           </div>
        </div>

      </div>
    </div>
  );
};
