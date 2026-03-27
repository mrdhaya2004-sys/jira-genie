export interface CountryCode {
  code: string;
  dialCode: string;
  name: string;
  format: RegExp;
  example: string;
  minLength: number;
  maxLength: number;
}

export const countryCodes: CountryCode[] = [
  { code: 'IN', dialCode: '+91', name: 'India', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'US', dialCode: '+1', name: 'United States', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', format: /^\d{10,11}$/, example: '10–11 digits', minLength: 10, maxLength: 11 },
  { code: 'CA', dialCode: '+1', name: 'Canada', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'AU', dialCode: '+61', name: 'Australia', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'DE', dialCode: '+49', name: 'Germany', format: /^\d{10,11}$/, example: '10–11 digits', minLength: 10, maxLength: 11 },
  { code: 'FR', dialCode: '+33', name: 'France', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'JP', dialCode: '+81', name: 'Japan', format: /^\d{10,11}$/, example: '10–11 digits', minLength: 10, maxLength: 11 },
  { code: 'CN', dialCode: '+86', name: 'China', format: /^\d{11}$/, example: '11 digits', minLength: 11, maxLength: 11 },
  { code: 'BR', dialCode: '+55', name: 'Brazil', format: /^\d{10,11}$/, example: '10–11 digits', minLength: 10, maxLength: 11 },
  { code: 'MX', dialCode: '+52', name: 'Mexico', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'IT', dialCode: '+39', name: 'Italy', format: /^\d{9,10}$/, example: '9–10 digits', minLength: 9, maxLength: 10 },
  { code: 'ES', dialCode: '+34', name: 'Spain', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'KR', dialCode: '+82', name: 'South Korea', format: /^\d{9,11}$/, example: '9–11 digits', minLength: 9, maxLength: 11 },
  { code: 'RU', dialCode: '+7', name: 'Russia', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'ZA', dialCode: '+27', name: 'South Africa', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'NG', dialCode: '+234', name: 'Nigeria', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'EG', dialCode: '+20', name: 'Egypt', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'KE', dialCode: '+254', name: 'Kenya', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'AE', dialCode: '+971', name: 'UAE', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'SA', dialCode: '+966', name: 'Saudi Arabia', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'SG', dialCode: '+65', name: 'Singapore', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'MY', dialCode: '+60', name: 'Malaysia', format: /^\d{9,10}$/, example: '9–10 digits', minLength: 9, maxLength: 10 },
  { code: 'PH', dialCode: '+63', name: 'Philippines', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'TH', dialCode: '+66', name: 'Thailand', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'ID', dialCode: '+62', name: 'Indonesia', format: /^\d{9,13}$/, example: '9–13 digits', minLength: 9, maxLength: 13 },
  { code: 'VN', dialCode: '+84', name: 'Vietnam', format: /^\d{9,10}$/, example: '9–10 digits', minLength: 9, maxLength: 10 },
  { code: 'PK', dialCode: '+92', name: 'Pakistan', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'BD', dialCode: '+880', name: 'Bangladesh', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'LK', dialCode: '+94', name: 'Sri Lanka', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'NP', dialCode: '+977', name: 'Nepal', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'NZ', dialCode: '+64', name: 'New Zealand', format: /^\d{8,10}$/, example: '8–10 digits', minLength: 8, maxLength: 10 },
  { code: 'SE', dialCode: '+46', name: 'Sweden', format: /^\d{7,13}$/, example: '7–13 digits', minLength: 7, maxLength: 13 },
  { code: 'NO', dialCode: '+47', name: 'Norway', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'DK', dialCode: '+45', name: 'Denmark', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'FI', dialCode: '+358', name: 'Finland', format: /^\d{6,11}$/, example: '6–11 digits', minLength: 6, maxLength: 11 },
  { code: 'NL', dialCode: '+31', name: 'Netherlands', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'BE', dialCode: '+32', name: 'Belgium', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'CH', dialCode: '+41', name: 'Switzerland', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'AT', dialCode: '+43', name: 'Austria', format: /^\d{4,13}$/, example: '4–13 digits', minLength: 4, maxLength: 13 },
  { code: 'PT', dialCode: '+351', name: 'Portugal', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'PL', dialCode: '+48', name: 'Poland', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'CZ', dialCode: '+420', name: 'Czech Republic', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'HU', dialCode: '+36', name: 'Hungary', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'RO', dialCode: '+40', name: 'Romania', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'GR', dialCode: '+30', name: 'Greece', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'TR', dialCode: '+90', name: 'Turkey', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'IL', dialCode: '+972', name: 'Israel', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'QA', dialCode: '+974', name: 'Qatar', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'KW', dialCode: '+965', name: 'Kuwait', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'BH', dialCode: '+973', name: 'Bahrain', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'OM', dialCode: '+968', name: 'Oman', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'JO', dialCode: '+962', name: 'Jordan', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'LB', dialCode: '+961', name: 'Lebanon', format: /^\d{7,8}$/, example: '7–8 digits', minLength: 7, maxLength: 8 },
  { code: 'IQ', dialCode: '+964', name: 'Iraq', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'IR', dialCode: '+98', name: 'Iran', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'AF', dialCode: '+93', name: 'Afghanistan', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'MM', dialCode: '+95', name: 'Myanmar', format: /^\d{7,10}$/, example: '7–10 digits', minLength: 7, maxLength: 10 },
  { code: 'KH', dialCode: '+855', name: 'Cambodia', format: /^\d{8,9}$/, example: '8–9 digits', minLength: 8, maxLength: 9 },
  { code: 'LA', dialCode: '+856', name: 'Laos', format: /^\d{8,10}$/, example: '8–10 digits', minLength: 8, maxLength: 10 },
  { code: 'TW', dialCode: '+886', name: 'Taiwan', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'HK', dialCode: '+852', name: 'Hong Kong', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'MO', dialCode: '+853', name: 'Macau', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'MN', dialCode: '+976', name: 'Mongolia', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'AR', dialCode: '+54', name: 'Argentina', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'CL', dialCode: '+56', name: 'Chile', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'CO', dialCode: '+57', name: 'Colombia', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'PE', dialCode: '+51', name: 'Peru', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'VE', dialCode: '+58', name: 'Venezuela', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'EC', dialCode: '+593', name: 'Ecuador', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'UY', dialCode: '+598', name: 'Uruguay', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'PY', dialCode: '+595', name: 'Paraguay', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'BO', dialCode: '+591', name: 'Bolivia', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'CR', dialCode: '+506', name: 'Costa Rica', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'PA', dialCode: '+507', name: 'Panama', format: /^\d{7,8}$/, example: '7–8 digits', minLength: 7, maxLength: 8 },
  { code: 'DO', dialCode: '+1', name: 'Dominican Republic', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'CU', dialCode: '+53', name: 'Cuba', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'JM', dialCode: '+1', name: 'Jamaica', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'GH', dialCode: '+233', name: 'Ghana', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'TZ', dialCode: '+255', name: 'Tanzania', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'UG', dialCode: '+256', name: 'Uganda', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'ET', dialCode: '+251', name: 'Ethiopia', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'MA', dialCode: '+212', name: 'Morocco', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'TN', dialCode: '+216', name: 'Tunisia', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'DZ', dialCode: '+213', name: 'Algeria', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'LY', dialCode: '+218', name: 'Libya', format: /^\d{9,10}$/, example: '9–10 digits', minLength: 9, maxLength: 10 },
  { code: 'SD', dialCode: '+249', name: 'Sudan', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'CM', dialCode: '+237', name: 'Cameroon', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'CI', dialCode: '+225', name: "Côte d'Ivoire", format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'SN', dialCode: '+221', name: 'Senegal', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'ZW', dialCode: '+263', name: 'Zimbabwe', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'MZ', dialCode: '+258', name: 'Mozambique', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'AO', dialCode: '+244', name: 'Angola', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'FJ', dialCode: '+679', name: 'Fiji', format: /^\d{7}$/, example: '7 digits', minLength: 7, maxLength: 7 },
  { code: 'PG', dialCode: '+675', name: 'Papua New Guinea', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'IS', dialCode: '+354', name: 'Iceland', format: /^\d{7}$/, example: '7 digits', minLength: 7, maxLength: 7 },
  { code: 'IE', dialCode: '+353', name: 'Ireland', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'LU', dialCode: '+352', name: 'Luxembourg', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'MT', dialCode: '+356', name: 'Malta', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'CY', dialCode: '+357', name: 'Cyprus', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'GE', dialCode: '+995', name: 'Georgia', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'AM', dialCode: '+374', name: 'Armenia', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'AZ', dialCode: '+994', name: 'Azerbaijan', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'KZ', dialCode: '+7', name: 'Kazakhstan', format: /^\d{10}$/, example: '10 digits', minLength: 10, maxLength: 10 },
  { code: 'UZ', dialCode: '+998', name: 'Uzbekistan', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'UA', dialCode: '+380', name: 'Ukraine', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'BY', dialCode: '+375', name: 'Belarus', format: /^\d{9,10}$/, example: '9–10 digits', minLength: 9, maxLength: 10 },
  { code: 'HR', dialCode: '+385', name: 'Croatia', format: /^\d{8,9}$/, example: '8–9 digits', minLength: 8, maxLength: 9 },
  { code: 'RS', dialCode: '+381', name: 'Serbia', format: /^\d{8,9}$/, example: '8–9 digits', minLength: 8, maxLength: 9 },
  { code: 'BG', dialCode: '+359', name: 'Bulgaria', format: /^\d{8,9}$/, example: '8–9 digits', minLength: 8, maxLength: 9 },
  { code: 'SK', dialCode: '+421', name: 'Slovakia', format: /^\d{9}$/, example: '9 digits', minLength: 9, maxLength: 9 },
  { code: 'SI', dialCode: '+386', name: 'Slovenia', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'LT', dialCode: '+370', name: 'Lithuania', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'LV', dialCode: '+371', name: 'Latvia', format: /^\d{8}$/, example: '8 digits', minLength: 8, maxLength: 8 },
  { code: 'EE', dialCode: '+372', name: 'Estonia', format: /^\d{7,8}$/, example: '7–8 digits', minLength: 7, maxLength: 8 },
];

export const getCountryByCode = (code: string): CountryCode | undefined =>
  countryCodes.find(c => c.code === code);

export const getCountryByDialCode = (dialCode: string): CountryCode | undefined =>
  countryCodes.find(c => c.dialCode === dialCode);

export const DEFAULT_COUNTRY = 'IN';

/**
 * Parse a stored mobile number like "+91 9876543210" into { countryCode, number }
 */
export const parseMobileNumber = (stored: string | null | undefined): { countryCode: string; number: string } => {
  if (!stored || !stored.trim()) return { countryCode: DEFAULT_COUNTRY, number: '' };

  // Try matching "+XX " prefix
  const match = stored.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) {
    const dialCode = match[1];
    const number = match[2];
    const country = countryCodes.find(c => c.dialCode === dialCode);
    if (country) return { countryCode: country.code, number };
  }

  // Fallback: treat entire string as number with default country
  return { countryCode: DEFAULT_COUNTRY, number: stored.replace(/\D/g, '') };
};

/**
 * Format for storage: "+91 9876543210"
 */
export const formatMobileForStorage = (countryCode: string, number: string): string | null => {
  if (!number.trim()) return null;
  const country = getCountryByCode(countryCode);
  if (!country) return null;
  return `${country.dialCode} ${number}`;
};

export const validateMobileForCountry = (countryCode: string, number: string): string | undefined => {
  if (!number) return undefined; // optional field
  const country = getCountryByCode(countryCode);
  if (!country) return 'Invalid country code';
  if (!country.format.test(number)) {
    return `Invalid number for ${country.name} (${country.example})`;
  }
  return undefined;
};
