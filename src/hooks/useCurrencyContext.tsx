import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface CurrencyInfo {
    code: string;
    symbol: string;
    country: string;
}

const DEFAULT_CURRENCY: CurrencyInfo = {
    code: 'EUR',
    symbol: '€',
    country: 'IT'
};

export const SUPPORTED_CURRENCIES = [
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' }
];

interface CurrencyContextType {
    currency: CurrencyInfo;
    isLoading: boolean;
    formatPrice: (amount: number, fromCurrency?: string, forceCurrency?: string) => string;
    getPaymentDetails: (amountInEUR: number, targetCurrency?: string) => { amount: number, currency: string };
    setManualCurrency: (code: string) => void;
    rates: Record<string, number>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrency] = useState<CurrencyInfo>(DEFAULT_CURRENCY);
    const [isLoading, setIsLoading] = useState(true);
    const [rates, setRates] = useState<Record<string, number>>({});

    const setManualCurrency = useCallback((code: string) => {
        const found = SUPPORTED_CURRENCIES.find(c => c.code === code);
        const newCurrency = {
            code: code,
            symbol: found?.symbol || '',
            country: 'MANUAL'
        };
        setCurrency(newCurrency);
        localStorage.setItem('userCurrency', JSON.stringify({
            data: newCurrency,
            timestamp: Date.now(),
            isManual: true
        }));
    }, []);

    useEffect(() => {
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const fetchRates = async () => {
            const cachedRates = localStorage.getItem('exchangeRates');
            if (cachedRates) {
                try {
                    const parsed = JSON.parse(cachedRates);
                    const age = Date.now() - parsed.timestamp;
                    if (age < 1 * 60 * 60 * 1000) {
                        setRates(parsed.data);
                        return;
                    }
                } catch (e) {}
            }

            try {
                const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
                const data = await response.json();
                if (data && data.rates) {
                    setRates(data.rates);
                    localStorage.setItem('exchangeRates', JSON.stringify({
                        data: data.rates,
                        timestamp: Date.now()
                    }));
                }
            } catch (err) {
                try {
                    const response = await fetch('https://open.er-api.com/v6/latest/EUR');
                    const data = await response.json();
                    if (data && data.rates) {
                        setRates(data.rates);
                    }
                } catch (err2) {}
            }
        };

        fetchRates();
    }, []);

    const getPaymentDetails = useCallback((amountInEUR: number, targetCurrency?: string) => {
        const fallbackRates: Record<string, number> = {
            'EUR': 1, 'INR': 106.6
        };
        const target = targetCurrency || currency.code;
        const rate = rates[target] || fallbackRates[target] || 1;
        return { amount: amountInEUR * rate, currency: target };
    }, [currency.code, rates]);

    const formatPrice = useCallback((amount: number, fromCurrency = 'EUR', forceCurrency?: string): string => {
        if (amount === 0) return 'Free';
        try {
            let details = fromCurrency === 'EUR' ? getPaymentDetails(amount) : { amount, currency: fromCurrency };

            if (forceCurrency && forceCurrency !== details.currency) {
                const fromRate = rates[fromCurrency] || 1;
                const toRate = rates[forceCurrency] || 1;
                details.amount = (amount / fromRate) * toRate;
                details.currency = forceCurrency;
            }

            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: details.currency,
                minimumFractionDigits: details.currency === 'INR' ? 0 : 2,
                maximumFractionDigits: 2
            }).format(details.amount);
        } catch (e) {
            return `${amount} ${fromCurrency}`;
        }
    }, [currency.code, getPaymentDetails, rates]);

    return (
        <CurrencyContext.Provider value={{
            currency,
            isLoading,
            formatPrice,
            getPaymentDetails,
            setManualCurrency,
            rates
        }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
}
