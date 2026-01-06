
export const toE164BD = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('880')) return cleaned;
  if (cleaned.startsWith('01')) return `88${cleaned}`;
  return `880${cleaned}`; // Fallback, assuming local number
};

export const buildWhatsAppUrl = (message?: string, phone: string = '01571339897') => {
  const e164 = toE164BD(phone);
  const baseUrl = `https://wa.me/${e164}`;
  return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('BDT', '৳');
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
};

// Remove non-digits and normalize for comparison
export const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// Compare two phone numbers by checking their last 10 digits (ignores 880 vs 0 prefix issues)
export const checkPhoneMatch = (p1: string, p2: string): boolean => {
  if (!p1 || !p2) return false;
  const n1 = normalizePhone(p1);
  const n2 = normalizePhone(p2);
  
  // Get last 10 digits (Standard BD mobile is 11 digits starting with 01, so last 10 is unique enough)
  const getLast10 = (s: string) => s.length >= 10 ? s.slice(-10) : s;
  return getLast10(n1) === getLast10(n2);
};
