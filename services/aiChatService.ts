
import { BASE_URL, ENDPOINTS, getHeaders, isDemoMode, simulateDelay } from './apiConfig';

// Types
export interface ChatSession {
    id: number;
    title: string;
    updatedAt: string;
}

export interface ChatMessageData {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

export interface SendMessageResponse {
    sessionId: number;
    chatTitle: string;
    reply: string;
    status: string;
}

// Mock data for demo mode
const mockSessions: ChatSession[] = [
    { id: 1, title: 'Portfolio Analysis', updatedAt: '2026-01-28T09:00:00' },
    { id: 2, title: 'Market Trends Discussion', updatedAt: '2026-01-27T15:30:00' },
    { id: 3, title: 'Investment Strategy', updatedAt: '2026-01-26T10:15:00' },
];

const mockMessages: Record<number, ChatMessageData[]> = {
    1: [
        { id: 1, role: 'user', content: 'Can you analyze my portfolio?', createdAt: '2026-01-28T09:00:00' },
        { id: 2, role: 'assistant', content: 'Based on your portfolio analysis:\n\n**Current Holdings:**\n- Your portfolio shows strong diversification across stocks, crypto, and bonds.\n- Total value: ₹96,155 with a 24h change of +2.1%\n\n**Recommendations:**\n1. Consider rebalancing your crypto allocation\n2. Your bond position provides good stability\n3. Tech stocks are performing well\n\nWould you like more details on any specific asset?', createdAt: '2026-01-28T09:01:00' },
    ],
    2: [
        { id: 3, role: 'user', content: 'What are the current market trends?', createdAt: '2026-01-27T15:30:00' },
        { id: 4, role: 'assistant', content: 'Here are the key market trends I\'m observing:\n\n📈 **Bullish Sectors:**\n- Technology continues to lead with AI-driven growth\n- Banking sector showing recovery\n\n📉 **Bearish Indicators:**\n- Some volatility in crypto markets\n- Global uncertainty affecting commodities\n\n**Key Indices:**\n- NIFTY 50: +0.8%\n- SENSEX: +0.65%\n\nWould you like specific sector analysis?', createdAt: '2026-01-27T15:31:00' },
    ],
    3: [
        { id: 5, role: 'user', content: 'Help me create an investment strategy', createdAt: '2026-01-26T10:15:00' },
        { id: 6, role: 'assistant', content: 'I\'d be happy to help you create a personalized investment strategy!\n\n**To get started, let me understand your goals:**\n\n1. **Time Horizon:** Short-term (1-2 years), Medium (3-5 years), or Long-term (10+ years)?\n2. **Risk Tolerance:** Conservative, Moderate, or Aggressive?\n3. **Investment Goals:** Retirement, wealth building, specific purchase?\n\nPlease share your preferences and I\'ll craft a tailored strategy for you.', createdAt: '2026-01-26T10:16:00' },
    ],
};

let mockSessionCounter = 4;

/**
 * Fetch all chat sessions for a user
 */
export const getSessions = async (userId: string | number): Promise<ChatSession[]> => {
    if (isDemoMode()) {
        await simulateDelay(500);
        return [...mockSessions];
    }

    try {
        const response = await fetch(`${BASE_URL}${ENDPOINTS.AI.SESSIONS}/${userId}`, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        // Transform backend response to frontend format
        return data.map((session: any) => ({
            id: session.sessionId,
            title: session.title,
            updatedAt: session.lastActive,
        }));
    } catch (error) {
        console.error('Error fetching sessions:', error);
        return [];
    }
};

/**
 * Fetch messages for a specific session
 */
export const getSessionMessages = async (sessionId: number): Promise<ChatMessageData[]> => {
    if (isDemoMode()) {
        await simulateDelay(300);
        return mockMessages[sessionId] || [];
    }

    try {
        const response = await fetch(`${BASE_URL}${ENDPOINTS.AI.SESSION_MESSAGES}/${sessionId}/messages`, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        // Transform backend response to frontend format
        return data.map((msg: any) => {
            let content = msg.content;
            if (typeof content === 'object') {
                content = JSON.stringify(content, null, 2);
            }

            return {
                id: msg.id,
                role: msg.role,
                content: content || '',
                createdAt: msg.createdAt || new Date().toISOString(),
            };
        });
    } catch (error) {
        console.error('Error fetching session messages:', error);
        return [];
    }
};

/**
 * Send a message (handles new session creation)
 */
export const sendMessage = async (
    userId: string | number,
    userMessage: string,
    sessionId: number | null
): Promise<SendMessageResponse> => {
    if (isDemoMode()) {
        await simulateDelay(1000);

        const newSessionId = sessionId || mockSessionCounter++;
        const title = sessionId ? mockSessions.find(s => s.id === sessionId)?.title || userMessage.slice(0, 30) : userMessage.slice(0, 30);

        // Add to mock data
        if (!sessionId) {
            const newSession: ChatSession = {
                id: newSessionId,
                title: title,
                updatedAt: new Date().toISOString(),
            };
            mockSessions.unshift(newSession);
            mockMessages[newSessionId] = [];
        }

        // Add user message
        const userMsgId = Date.now();
        mockMessages[newSessionId].push({
            id: userMsgId,
            role: 'user',
            content: userMessage,
            createdAt: new Date().toISOString(),
        });

        // Generate mock AI response
        const aiResponse = generateMockResponse(userMessage);
        mockMessages[newSessionId].push({
            id: userMsgId + 1,
            role: 'assistant',
            content: aiResponse,
            createdAt: new Date().toISOString(),
        });

        return {
            sessionId: newSessionId,
            chatTitle: title,
            reply: aiResponse,
            status: 'SUCCESS',
        };
    }

    try {
        const payload = {
            userId: Number(userId),
            userMessage: userMessage,
            sessionId: sessionId,
        };

        const response = await fetch(`${BASE_URL}${ENDPOINTS.AI.CHAT}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        let reply = data.reply || data.answer || 'No response received.';

        if (typeof reply === 'object') {
            reply = JSON.stringify(reply, null, 2);
        }

        return {
            sessionId: data.sessionId,
            chatTitle: data.chatTitle || userMessage.slice(0, 30),
            reply: reply,
            status: data.status || 'SUCCESS',
        };
    } catch (error) {
        console.error('Error sending message:', error);
        return {
            sessionId: sessionId || 0,
            chatTitle: userMessage.slice(0, 30),
            reply: 'Sorry, I encountered an error. Please try again.',
            status: 'ERROR',
        };
    }
};

/**
 * Generate mock AI response based on user message
 */
function generateMockResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('portfolio') || lowerMessage.includes('holdings')) {
        return `Based on your portfolio:\n\n**Summary:**\n- Total Value: ₹96,155\n- 24h Change: +2.1%\n- Top Performer: Bitcoin (+3.5%)\n\n**Asset Allocation:**\n- Stocks: 35%\n- Crypto: 45%\n- Bonds: 15%\n- Cash: 5%\n\nWould you like recommendations for rebalancing?`;
    }

    if (lowerMessage.includes('market') || lowerMessage.includes('trend')) {
        return `**Current Market Overview:**\n\n📈 **Indian Markets:**\n- NIFTY 50: 21,450 (+0.82%)\n- SENSEX: 70,850 (+0.75%)\n\n🌍 **Global Sentiment:**\n- US markets showing strength\n- Tech sector leading gains\n\n**Key Events:**\n- RBI policy meeting upcoming\n- Q3 earnings season ongoing\n\nAny specific sector you'd like to explore?`;
    }

    if (lowerMessage.includes('buy') || lowerMessage.includes('sell')) {
        return `Before making any trading decisions, let me analyze:\n\n**Considerations:**\n1. Current market conditions\n2. Your risk tolerance\n3. Portfolio diversification needs\n\n**My Recommendation:**\nI'd suggest reviewing your goals and current allocation before any trades. Would you like me to:\n- Analyze a specific stock?\n- Review your portfolio balance?\n- Suggest rebalancing options?`;
    }

    return `Thank you for your question! I'm DJ-AI, your intelligent wealth advisor.\n\nI can help you with:\n- 📊 Portfolio analysis and recommendations\n- 📈 Market trends and insights\n- 🎯 Investment goal planning\n- 💡 Trading strategies\n\nHow can I assist you today?`;
}
