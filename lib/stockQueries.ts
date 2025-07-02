import { fetchStockPrices, calculateStockValue } from '@/lib/stockUtils';
import { supabase } from '@/lib/supabaseClient';

// If you have a Stock or StockWithValue type, import it here
// import type { Stock, StockWithValue } from '...';

export async function fetchStocksWithPrices() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('stocks')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];
  const validStocks = data.filter((stock: any) =>
    typeof stock.stock_code === 'string' && stock.stock_code.trim() !== '' &&
    typeof stock.exchange === 'string' && stock.exchange.trim() !== ''
  );
  const symbols = validStocks.map((stock: any) => stock.stock_code);
  const exchanges = validStocks.map((stock: any) => stock.exchange === 'US' ? 'NASDAQ' : stock.exchange);
  const pricesResponse = await fetchStockPrices(symbols, exchanges);
  if (pricesResponse && pricesResponse.success) {
    return data.map((stock: any) => {
      if (!symbols.includes(stock.stock_code)) return stock;
      const priceData = pricesResponse.prices[stock.stock_code];
      if (priceData && priceData.price !== null) {
        const currentValue = calculateStockValue(stock.quantity, priceData.price);
        return {
          ...stock,
          currentPrice: priceData.price,
          currentValue: currentValue,
          currency: priceData.currency,
          exchangeRate: priceData.exchangeRate,
          originalPrice: priceData.originalPrice,
          originalCurrency: priceData.originalCurrency
        };
      } else {
        return {
          ...stock,
          currentPrice: undefined,
          currentValue: undefined,
          currency: priceData?.currency || 'INR',
          exchangeRate: priceData?.exchangeRate,
          originalPrice: priceData?.originalPrice,
          originalCurrency: priceData?.originalCurrency
        };
      }
    });
  }
  return data;
} 