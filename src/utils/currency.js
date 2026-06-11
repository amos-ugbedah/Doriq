import API_BASE from "../config/api";

export const SUPPORTED_CURRENCIES = {
    USD: { symbol: '$', name: 'US Dollar', isPrimary: true },
    NGN: { symbol: '₦', name: 'Nigerian Naira', isPrimary: false },
    GBP: { symbol: '£', name: 'British Pound', isPrimary: false },
    EUR: { symbol: '€', name: 'Euro', isPrimary: false },
    CAD: { symbol: 'C$', name: 'Canadian Dollar', isPrimary: false },
    GHS: { symbol: '₵', name: 'Ghanaian Cedi', isPrimary: false },
    KES: { symbol: 'KSh', name: 'Kenyan Shilling', isPrimary: false },
    ZAR: { symbol: 'R', name: 'South African Rand', isPrimary: false }
};

export const getUserLocation = async () => {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return {
            country: data.country_code,
            currency: getCurrencyForCountry(data.country_code),
            currencySymbol: SUPPORTED_CURRENCIES[getCurrencyForCountry(data.country_code)]?.symbol
        };
    } catch (error) {
        return { country: 'US', currency: 'USD', currencySymbol: '$' };
    }
};

export const getCurrencyForCountry = (countryCode) => {
    const map = {
        'NG': 'NGN', 'US': 'USD', 'GB': 'GBP', 'CA': 'CAD',
        'GH': 'GHS', 'KE': 'KES', 'ZA': 'ZAR', 'FR': 'EUR',
        'DE': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR'
    };
    return map[countryCode] || 'USD';
};

export const convertAmount = async (amount, fromCurrency, toCurrency) => {
    try {
        const response = await fetch(`${API_BASE}/convert-amount`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, fromCurrency, toCurrency })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        // Fallback conversion
        const rates = { USD: 1, NGN: 1500, GBP: 0.78, EUR: 0.92, CAD: 1.35 };
        const rate = (rates[toCurrency] || 1) / (rates[fromCurrency] || 1);
        const converted = amount * rate;
        return { converted, rate };
    }
};

export const formatCurrency = (amount, currency) => {
    const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES['USD'];
    return `${config.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};