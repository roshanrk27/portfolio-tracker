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
  const validStocks = data.filter((stock: Record<string, unknown>) =>
    typeof stock.stock_code === 'string' && stock.stock_code.trim() !== '' &&
    typeof stock.exchange === 'string' && stock.exchange.trim() !== ''
  );
  const symbols = validStocks.map((stock: Record<string, unknown>) => 
    typeof stock.stock_code === 'string' ? stock.stock_code : ''
  );
  const exchanges = validStocks.map((stock: Record<string, unknown>) => 
    typeof stock.exchange === 'string' ? (stock.exchange === 'US' ? 'NASDAQ' : stock.exchange) : ''
  );
  const pricesResponse = await fetchStockPrices(symbols, exchanges);
  if (pricesResponse && pricesResponse.success) {
    return data.map((stock: Record<string, unknown>) => {
      const stockCode = typeof stock.stock_code === 'string' ? stock.stock_code : '';
      if (!symbols.includes(stockCode)) return stock;
      const priceData = pricesResponse.prices[stockCode];
      if (priceData && priceData.price !== null) {
        const quantity = typeof stock.quantity === 'number' ? stock.quantity : 0;
        const currentValue = calculateStockValue(quantity, priceData.price);
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