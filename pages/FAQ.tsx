
import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { FiPlus, FiMinus, FiSearch, FiHelpCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    category: 'Orders & Shipping',
    items: [
      { q: 'Do you offer Cash on Delivery (COD)?', a: 'Yes, we offer Cash on Delivery nationwide. You can pay the courier when you receive your product. We may ask for a small advance payment for orders outside Dhaka to confirm seriousness.' },
      { q: 'How long does delivery take?', a: 'Inside Dhaka, we aim for delivery within 12-24 hours. Outside Dhaka, it typically takes 24-48 hours depending on your location and the courier service.' },
      { q: 'Can I open the package before paying?', a: 'This depends on the courier service policy (e.g., Pathao, Steadfast). Generally, you can check the packaging integrity, but full opening might require payment first. However, we offer a 7-day return policy for peace of mind.' },
      { q: 'What are the shipping charges?', a: 'We charge a flat rate of 60 BDT for delivery inside Dhaka and 120 BDT for outside Dhaka. Orders over specific amounts may qualify for free shipping.' }
    ]
  },
  {
    category: 'Warranty & Returns',
    items: [
      { q: 'Is there a warranty on watches?', a: 'Yes! Most of our products come with a brand warranty ranging from 6 months to 2 years. The specific warranty period is mentioned on the product page.' },
      { q: 'What does the warranty cover?', a: 'Warranty typically covers manufacturing defects in the movement, engine, or digital module. It does not cover physical damage, water damage (unless specified), or strap wear and tear.' },
      { q: 'What is your return policy?', a: 'We have a 7-day easy return/exchange policy. If you receive a defective product or the wrong item, notify us within 24 hours for a replacement.' }
    ]
  },
  {
    category: 'Product & Authenticity',
    items: [
      { q: 'Are your products 100% original?', a: 'Absolutely. We only source from authorized distributors and direct brand channels. We have a zero-tolerance policy for fakes.' },
      { q: 'Can I see live photos before buying?', a: 'Yes! Simply message us on WhatsApp with the product name, and our team will send you real-time photos or videos of the watch.' },
      { q: 'Do you have a physical showroom?', a: 'Currently, we operate as an online-first store to keep prices competitive. However, our Dhaka warehouse facilitates fast local deliveries.' }
    ]
  }
];

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<string | null>('0-0');
  const [searchTerm, setSearchTerm] = useState('');

  const toggle = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  const filteredFAQs = FAQS.map(cat => ({
    ...cat,
    items: cat.items.filter(i => 
      i.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="bg-white min-h-screen">
      
      {/* Header */}
      <div className="bg-slate-50 py-20 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 block">Help Center</span>
          <h1 className="text-4xl font-bold tracking-tighter mb-8 text-slate-900">How can we help?</h1>
          
          <div className="relative max-w-lg mx-auto">
            <Icon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search for answers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-full shadow-sm text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-16">
        {filteredFAQs.length > 0 ? (
          <div className="space-y-12">
            {filteredFAQs.map((section, secIdx) => (
              <div key={secIdx}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 border-b border-slate-100 pb-2">{section.category}</h3>
                <div className="space-y-4">
                  {section.items.map((item, idx) => {
                    const id = `${secIdx}-${idx}`;
                    const isOpen = openIndex === id;
                    return (
                      <div key={idx} className="border border-slate-100 rounded-sm overflow-hidden transition-all duration-300">
                        <button 
                          onClick={() => toggle(id)}
                          className={`w-full flex items-center justify-between p-5 text-left transition-colors ${isOpen ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
                        >
                          <span className="text-sm font-bold text-slate-900 pr-8">{item.q}</span>
                          <Icon icon={isOpen ? FiMinus : FiPlus} className="text-slate-400 flex-shrink-0" />
                        </button>
                        <div 
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                        >
                          <div className="p-5 pt-0 text-sm text-slate-600 leading-relaxed font-light">
                            {item.a}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Icon icon={FiHelpCircle} size={48} className="text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500">No results found for "{searchTerm}".</p>
            <Link to="/contact" className="text-slate-900 underline font-bold mt-2 inline-block">Contact Support</Link>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="bg-slate-900 text-white py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
        <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm">Our support team is available on WhatsApp to answer any specific queries you might have.</p>
        <div className="flex gap-4 justify-center">
          <Link to="/contact" className="bg-white text-slate-900 px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-100">Contact Us</Link>
          <a href="https://wa.me/8801571339897" className="border border-white text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-white/10">WhatsApp</a>
        </div>
      </div>

    </div>
  );
};
