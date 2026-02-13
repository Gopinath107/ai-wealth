
import { Portfolio, Asset, AssetType } from '../types';
import { getMockPortfolio, MOCK_ASSETS, updateMockAssets, addMockTransaction } from './mockData';
import { BASE_URL, ENDPOINTS, getHeaders, simulateDelay, shouldUseBackend } from './apiConfig';

export const portfolioService = {
  // GET /portfolio
  get: async (): Promise<Portfolio> => {
    if (shouldUseBackend()) {
      const res = await fetch(`${BASE_URL}${ENDPOINTS.PORTFOLIO.GET}`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const data = await res.json();
      return data.result || data;
    }
    
    await simulateDelay();
    return getMockPortfolio();
  },
  
  // POST /portfolio/trade
  trade: async (payload: { symbol: string, action: 'BUY' | 'SELL', quantity: number, price: number }) => {
    if (payload.quantity <= 0) throw new Error("Invalid quantity");

    if (shouldUseBackend()) {
        const res = await fetch(`${BASE_URL}${ENDPOINTS.PORTFOLIO.TRADE}`, { 
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(!data.success) throw new Error(data.errors?.[0] || 'Trade failed');
        return data.result;
    }

    // Mock Logic
    await simulateDelay(1000);
    const { symbol, action, quantity, price } = payload;
    const totalCost = quantity * price;
    
    // Find Cash Asset
    const cashIndex = MOCK_ASSETS.findIndex(a => a.type === AssetType.Cash);
    let cash = MOCK_ASSETS[cashIndex]; // Reference to mutable object in array

    if (!cash) {
        // Create cash if missing in mock
        cash = { id: 'usd', symbol: 'USD', name: 'Cash', type: AssetType.Cash, quantity: 10000, price: 1, change24h: 0, value: 10000 };
        updateMockAssets([...MOCK_ASSETS, cash]);
    }

    const currentAssets = [...MOCK_ASSETS];

    if (action === 'BUY') {
        if (cash.value < totalCost) throw new Error("Insufficient funds for trade in mock mode");
        
        // Update Cash
        cash.value -= totalCost;
        cash.quantity = cash.value;

        // Update/Add Asset
        const assetIndex = currentAssets.findIndex(a => a.symbol === symbol && a.type !== AssetType.Cash);
        if (assetIndex >= 0) {
            const asset = currentAssets[assetIndex];
            const newQty = asset.quantity + quantity;
            currentAssets[assetIndex] = { ...asset, quantity: newQty, value: newQty * asset.price };
        } else {
            currentAssets.push({
                id: Date.now().toString(),
                symbol,
                name: symbol, 
                type: AssetType.Stock, 
                quantity,
                price,
                change24h: 0,
                value: totalCost
            });
        }
    } else { // SELL
        const assetIndex = currentAssets.findIndex(a => a.symbol === symbol);
        if (assetIndex === -1 || currentAssets[assetIndex].quantity < quantity) {
            throw new Error("Insufficient holdings in mock mode");
        }
        
        const asset = currentAssets[assetIndex];
        const newQty = asset.quantity - quantity;
        
        // Update Cash
        cash.value += totalCost;
        cash.quantity = cash.value;

        if (newQty <= 0.000001) {
            currentAssets.splice(assetIndex, 1);
        } else {
            currentAssets[assetIndex] = { ...asset, quantity: newQty, value: newQty * asset.price };
        }
    }

    updateMockAssets(currentAssets);
    
    // Add Transaction Record
    addMockTransaction({
        id: `tx-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: action === 'BUY' ? 'Buy' : 'Sell',
        assetSymbol: symbol,
        amount: quantity,
        price: price,
        total: totalCost,
        status: 'Completed'
    });

    return { success: true, message: `${action} order for ${symbol} executed.` };
  },

  // POST /portfolio/assets
  addAsset: async (assetData: Partial<Asset>) => {
    if (shouldUseBackend()) {
        const res = await fetch(`${BASE_URL}${ENDPOINTS.PORTFOLIO.ASSETS}`, { 
            method: 'POST', 
            headers: getHeaders(),
            body: JSON.stringify(assetData)
        });
        const data = await res.json();
        if(!data.success) throw new Error(data.errors?.[0] || 'Failed to add asset');
        return data.result;
    }

    await simulateDelay(1000);
    const newAsset = {
        id: Date.now().toString(),
        symbol: assetData.symbol!,
        name: assetData.name!,
        type: assetData.type!,
        quantity: assetData.quantity!,
        price: assetData.price!,
        value: assetData.quantity! * assetData.price!,
        change24h: 0
    };
    updateMockAssets([...MOCK_ASSETS, newAsset]);
    return { success: true, id: newAsset.id, ...assetData };
  }
};
