
import { getHeaders } from './apiConfig';

const AI_STRATEGY_BASE_URL = 'http://localhost:8080';

// Request payload for AI Strategy API
export interface AIStrategyRequest {
    instrumentKey: string;
}

// Response structure from AI Strategy API
export interface AIStrategyResponse {
    success: boolean;
    result: AIStrategyResult | null;
    errors: string[];
    errorCount: number;
}

export interface AIStrategyResult {
    instrumentKey: string;
    recommendation: 'BUY' | 'SELL' | 'HOLD';
    confidence: number; // Percentage (0-100)
    horizon: string; // e.g., "Short-term", "Long-term"
    riskLevel: string; // e.g., "Low", "Medium", "High"
    personalizedStrategy: string; // Full strategy text
    keyDrivers?: string[]; // Optional bullet points
    asOf: string; // Timestamp

    // Technical indicators (not displayed for now, but available)
    sma?: number;
    rsi?: number;
    macd?: number;
}

/**
 * Fetch personalized AI investment strategy for a stock
 */
export const getAIStrategy = async (
    instrumentKey: string
): Promise<AIStrategyResult | null> => {
    try {
        const payload: AIStrategyRequest = {
            instrumentKey
        };

        const response = await fetch(`${AI_STRATEGY_BASE_URL}/api/ai/strategy`, {
            method: 'POST',
            headers: getHeaders(), // Includes JWT Authorization and Content-Type
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data: AIStrategyResponse = await response.json();

        if (!data.success) {
            const errorMsg = data.errors?.[0] || 'AI Strategy API returned unsuccessful response';
            throw new Error(errorMsg);
        }

        return data.result;
    } catch (error: any) {
        console.error('[aiStrategyService] Error fetching AI strategy:', error);
        throw error; // Re-throw for component to handle
    }
};
