
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Portfolio, RebalancingSuggestion, InvestmentGoal, NewsItem, Asset, GoalRecommendation } from '../types';
import { BASE_URL, ENDPOINTS, getHeaders, shouldUseBackend, isDemoMode, simulateDelay } from './apiConfig';

// Use import.meta.env for Vite and ensure we use the VITE_ prefix
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
if (!apiKey) {
  console.error("CRITICAL: VITE_GEMINI_API_KEY is missing. AI features will fail.");
}
const ai = new GoogleGenAI({ apiKey });
const ADVISOR_SYSTEM_INSTRUCTION = `You are DJ-AI, an expert financial analyst and wealth advisor.
Your capabilities include portfolio analysis, market trend interpretation, and strategic investment planning.`;

export const searchRealTimeNews = async (query: string): Promise<NewsItem[]> => {
  if (isDemoMode()) {
    await simulateDelay(1500);
    return [{
      id: 'demo-n1',
      title: `Latest developments in ${query}`,
      source: "Grounded AI Feed",
      publishedAt: new Date().toISOString(),
      description: `Our AI has scanned current web reports for ${query}. Markets are currently showing varied reactions to the latest data points.`,
      aiImpactLabel: "Neutral",
      url: "#",
      aiImpactSummary: "Market reaction is mixed.",
      aiKeyPoints: "Volatile\nUncertain",
      disclaimer: "For informational purposes only."
    }];
  }
  try {
    const modelId = 'gemini-3-flash-preview';
    const prompt = `Find the latest real-time financial and market news for: "${query}".`;
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              source: { type: Type.STRING },
              time: { type: Type.STRING },
              summary: { type: Type.STRING },
              url: { type: Type.STRING },
              sentiment: { type: Type.STRING, enum: ["Bullish", "Bearish", "Neutral"] }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Real-time News Search Error:", error);
    return [];
  }
};

export const chatWithAdvisor = async (
  message: string,
  userId: string | number,
  context?: {
    instrumentKey: string;
    symbol: string;
    name: string;
  }
): Promise<{ text: string; sources?: { title: string; uri: string }[] }> => {
  try {
    if (isDemoMode()) {
      await simulateDelay(1500);
      // Keep existing demo logic if needed, or simplify. 
      // For now, retaining a basic mock response to avoid breaking demo flow completely.
      return {
        text: "Strategy analysis (Demo Mode): Consider diversifying your portfolio."
      };
    }

    const payload: any = {
      userId: 2, // Default fallback
      message: message
    };

    // Robust userId resolution: prop -> localStorage -> default(2)
    let finalUserId = Number(userId);
    if (!finalUserId || isNaN(finalUserId)) {
      const stored = localStorage.getItem('userId');
      if (stored) {
        finalUserId = parseInt(stored, 10);
      }
    }

    if (finalUserId && !isNaN(finalUserId)) {
      payload.userId = finalUserId;
    } else {
      console.warn('AI Chat: No valid userId found, using default 2');
    }

    if (context && context.instrumentKey) {
      payload.context = {
        selectedInstrumentKey: context.instrumentKey,
        selectedTradingSymbol: context.symbol,
        selectedName: context.name
      };
    }

    const response = await fetch(`${BASE_URL}${ENDPOINTS.AI.CHAT}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();

    // Backend response format: { answer: "...", sources: [], ... }
    return {
      text: data.answer || "No response received.",
      sources: [] // Explicitly ignoring sources as per UI requirements
    };

  } catch (error) {
    console.error("AI Chat Error:", error);
    return { text: "Sorry, AI service is not responding. Please try again." };
  }
};

export const auditPortfolio = async (portfolio: Portfolio): Promise<string> => {
  if (isDemoMode()) {
    await simulateDelay(2000);
    return "### Demo Audit Report\n\n**1. Diversification**: Your portfolio is heavily weighted toward Crypto (45%). Recommendation: Trim BTC positions.\n\n**2. Risk Assessment**: Medium-High risk. Exposure to tech volatility is high.\n\n**3. Recommendations**: Diversify into Bonds (VND) to stabilize the portfolio.";
  }
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Audit this portfolio: ${JSON.stringify(portfolio)}`,
    config: { thinkingConfig: { thinkingBudget: 16000 } }
  });
  return response.text || "Audit failed.";
};

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

export const createGoalPlan = async (messages: ChatMsg[], userId?: string | number): Promise<Partial<InvestmentGoal> | null> => {
  if (shouldUseBackend()) {
    try {
      const response = await fetch(`${BASE_URL}${ENDPOINTS.GOALS.AI_PLAN}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId, messages })
      });
      const data = await response.json();
      if (data.success && data.result) {
        return data.result;
      }
      return null;
    } catch (e) {
      console.error('[GeminiService] Backend AI Plan failed', e);
      return null;
    }
  }

  // Demo mode fallback
  await simulateDelay(2000);
  return {
    question: "Which car model are you targeting?",
    suggestions: ["Tata Nexon", "Hyundai Creta", "Maruti Brezza", "Honda City"]
  };
};

export const generateGoalStrategy = async (goal: InvestmentGoal, currentPortfolioValue: number): Promise<GoalRecommendation | null> => {
  if (isDemoMode()) {
    await simulateDelay(1500);
    return {
      monthlyContribution: Math.max(100, Math.round((goal.targetAmount - goal.currentAmount) / 48)),
      riskProfile: "Aggressive Growth",
      allocationStrategy: [
        { assetClass: 'Stocks', percentage: 70 },
        { assetClass: 'Crypto', percentage: 10 },
        { assetClass: 'Bonds', percentage: 20 }
      ],
      milestones: ["Reach 20% by next year", "Rebalance annually"]
    };
  }

  try {
    const modelId = 'gemini-3-flash-preview';
    const prompt = `
      Review this existing financial goal and generate a specific strategy update.
      Goal: ${JSON.stringify(goal)}
      Current Portfolio Value: ${currentPortfolioValue}
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            monthlyContribution: { type: Type.NUMBER },
            riskProfile: { type: Type.STRING },
            allocationStrategy: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  assetClass: { type: Type.STRING, enum: ['Stocks', 'Crypto', 'Bonds', 'Cash', 'Real Estate'] },
                  percentage: { type: Type.NUMBER }
                }
              }
            },
            milestones: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    return JSON.parse(response.text || 'null');
  } catch (error) {
    console.error("Goal Strategy Gen Error:", error);
    return null;
  }
};

export const getAssetAdvice = async (asset: Partial<Asset>, portfolio?: Portfolio, goals?: InvestmentGoal[]): Promise<{ action: 'Buy' | 'Hold' | 'Sell' | 'Trim', reason: string }> => {
  if (isDemoMode()) {
    await simulateDelay(1000);
    const isGoodStock = asset.symbol === 'AAPL' || asset.symbol === 'MSFT' || asset.symbol === 'BTC';
    return {
      action: isGoodStock ? "Buy" : "Hold",
      reason: isGoodStock
        ? `Increasing exposure to ${asset.symbol} aligns with your long-term growth targets.`
        : `Maintain current position in ${asset.symbol} as a defensive hedge against volatility.`
    };
  }

  try {
    const modelId = 'gemini-3-flash-preview';

    // Formatting context with explicit Goal awareness
    const goalContext = goals && goals.length > 0
      ? goals.map(g => `- ${g.name} (Target: $${g.targetAmount}, Deadline: ${g.deadline}, Type: ${g.type})`).join('\n')
      : "General Wealth Accumulation (No specific goals set)";

    const portfolioVal = portfolio ? `$${portfolio.totalValue.toLocaleString()}` : "Unknown";

    const prompt = `
          You are a specialized Investment Analyst AI. 
          Review this specific asset in the context of the user's portfolio and SPECIFIC investment goals.

          ASSET: ${asset.symbol} (${asset.name})
          Price: $${asset.price}
          Holdings: ${asset.quantity || 0} units
          Type: ${asset.type}

          USER GOALS: 
          ${goalContext}
          
          TOTAL PORTFOLIO VALUE: ${portfolioVal}

          TASK:
          1. Recommendation: Determine if the user should Buy, Sell, Hold, or Trim based on how this asset fits into the deadlines and risk profiles of the goals above.
          2. Reason: Provide a personalized one-sentence strategy justification referencing a specific goal if applicable.

          Output JSON: { "action": "Buy" | "Sell" | "Hold" | "Trim", "reason": "String" }
        `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, enum: ["Buy", "Sell", "Hold", "Trim"] },
            reason: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || '{"action":"Hold","reason":"AI Analysis unavailable"}');
  } catch (error) {
    console.error("Asset Advice Error:", error);
    return {
      action: "Hold",
      reason: "Detailed AI analysis currently unavailable. Asset aligns with general diversification."
    };
  }
};

export const getRebalancingSuggestions = async (portfolio: Portfolio): Promise<RebalancingSuggestion[]> => {
  if (isDemoMode()) {
    await simulateDelay(1200);
    return [
      { symbol: "BTC", action: "Sell", quantity: 0.05, reason: "Rebalancing crypto exposure to target 10%." },
      { symbol: "VND", action: "Buy", quantity: 50, reason: "Increasing bond safety net." }
    ];
  }
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Rebalance suggestions for ${JSON.stringify(portfolio)}`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || '[]');
};

export const analyzeNewsSentiment = async (headline: string, summary: string): Promise<{ sentiment: string, reason: string }> => {
  if (isDemoMode()) {
    await simulateDelay(500);
    return { sentiment: "Bullish", reason: "Positive regulatory signals detected." };
  }
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite-latest',
    contents: `Analyze sentiment: ${headline}`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || '{"sentiment":"Neutral","reason":"N/A"}');
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: { parts: [{ text }] },
    config: { responseModalities: [Modality.AUDIO] },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: [{ inlineData: { mimeType, data: base64Audio } }, { text: "Transcribe" }] }
  });
  return response.text || "";
};

export const getLiveClient = () => ai.live;
