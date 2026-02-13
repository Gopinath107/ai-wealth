
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Bot,
    Sparkles,
    TrendingUp,
    PieChart,
    Target,
    Mic,
    History,
    Plus,
    User,
    X,
    FileText
} from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import {
    getSessions,
    getSessionMessages,
    sendMessage,
    ChatSession,
    ChatMessageData
} from '../../services/aiChatService';
import { Asset } from '../../types';
import './Advisor.css';

interface AdvisorProps {
    portfolio: any;
    isLoading: boolean;
    onOpenLiveVoice: () => void;
    onViewAsset: (asset: any) => void;
    userId: string | number;
    contextAsset: Asset | null;
}

const Advisor: React.FC<AdvisorProps> = ({
    portfolio,
    isLoading: appLoading,
    onOpenLiveVoice,
    onViewAsset,
    userId,
    contextAsset,
}) => {
    // Session state
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [sessionsLoading, setSessionsLoading] = useState(true);

    // Messages state
    const [messages, setMessages] = useState<ChatMessageData[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);

    // UI state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages.length, isSending, scrollToBottom]);

    // Load sessions on mount
    useEffect(() => {
        const loadSessions = async () => {
            setSessionsLoading(true);
            try {
                const data = await getSessions(userId);
                setSessions(data);
            } catch (error) {
                console.error('Error loading sessions:', error);
            } finally {
                setSessionsLoading(false);
            }
        };

        loadSessions();
    }, [userId]);

    // Load messages when session changes
    useEffect(() => {
        const loadMessages = async () => {
            if (currentSessionId === null) {
                setMessages([]);
                return;
            }

            setMessagesLoading(true);
            try {
                const data = await getSessionMessages(currentSessionId);
                setMessages(data);
            } catch (error) {
                console.error('Error loading messages:', error);
            } finally {
                setMessagesLoading(false);
            }
        };

        loadMessages();
    }, [currentSessionId]);

    // Handle new chat
    const handleNewChat = useCallback(() => {
        setCurrentSessionId(null);
        setMessages([]);
        setIsHistoryOpen(false);
    }, []);

    // Handle session selection
    const handleSelectSession = useCallback((sessionId: number) => {
        if (sessionId !== currentSessionId) {
            setCurrentSessionId(sessionId);
            setIsHistoryOpen(false);
        }
    }, [currentSessionId]);

    // Simulate typing effect
    const simulateTyping = useCallback((fullText: string, messageId: number) => {
        return new Promise<void>((resolve) => {
            let currentIndex = 0;
            const charsPerInterval = 3;
            const intervalMs = 20;

            setStreamingMessageId(messageId);

            const interval = setInterval(() => {
                currentIndex += charsPerInterval;

                if (currentIndex >= fullText.length) {
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === messageId
                                ? { ...msg, content: fullText }
                                : msg
                        )
                    );
                    setStreamingMessageId(null);
                    clearInterval(interval);
                    resolve();
                } else {
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === messageId
                                ? { ...msg, content: fullText.slice(0, currentIndex) }
                                : msg
                        )
                    );
                }
            }, intervalMs);
        });
    }, []);

    // Handle send message
    const handleSendMessage = useCallback(async (userMessage: string) => {
        if (isSending) return;

        setIsSending(true);

        try {
            const userMsgId = Date.now();
            const userMsg: ChatMessageData = {
                id: userMsgId,
                role: 'user',
                content: userMessage,
                createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev, userMsg]);

            const response = await sendMessage(userId, userMessage, currentSessionId);

            if (currentSessionId === null && response.sessionId) {
                setCurrentSessionId(response.sessionId);

                const newSession: ChatSession = {
                    id: response.sessionId,
                    title: response.chatTitle,
                    updatedAt: new Date().toISOString(),
                };
                setSessions(prev => [newSession, ...prev]);
            }

            const aiMsgId = Date.now() + 1;
            const aiMsg: ChatMessageData = {
                id: aiMsgId,
                role: 'assistant',
                content: '',
                createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev, aiMsg]);

            await simulateTyping(response.reply, aiMsgId);

        } catch (error) {
            console.error('Error sending message:', error);
            const errorMsg: ChatMessageData = {
                id: Date.now() + 2,
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsSending(false);
        }
    }, [isSending, userId, currentSessionId, simulateTyping]);

    // Handle suggestion click
    const handleSuggestionClick = useCallback((suggestion: string) => {
        handleSendMessage(suggestion);
    }, [handleSendMessage]);

    // Get current session title
    const currentSessionTitle = currentSessionId
        ? sessions.find(s => s.id === currentSessionId)?.title || 'Chat'
        : 'New Chat';

    // Check if we're in a new chat state
    const isNewChat = currentSessionId === null && messages.length === 0;

    // Filter sessions for search
    const filteredSessions = sessions.filter(session =>
        session.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Format date with message count
    const formatSessionMeta = (dateString: string, messageCount?: number): string => {
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric'
        });
        const count = messageCount ?? 2; // Default to 2 if not provided
        return `${formattedDate} • ${count} messages`;
    };

    return (
        <div className="advisor-workspace">
            {/* Top Header / Toolbar */}
            <header className="advisor-header">
                <div className="header-left">
                    <div className="header-title-group">
                        <h1 className="header-title">AI Analyst Chat</h1>
                        <span className="beta-badge">BETA</span>
                    </div>
                    <p className="header-subtitle">{isNewChat ? 'Analyze my current portfolio a...' : currentSessionTitle}</p>
                </div>
                <div className="header-right">
                    <button
                        className={`header-btn history-btn ${isHistoryOpen ? 'active' : ''}`}
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        title="Chat History"
                    >
                        <History size={16} />
                        <span>History</span>
                    </button>
                    <button
                        className="header-btn new-chat-btn-header"
                        onClick={handleNewChat}
                        title="New Chat"
                    >
                        <Plus size={16} />
                        <span>New Chat</span>
                    </button>
                    <button className="header-btn profile-btn" title="Profile">
                        <User size={18} />
                    </button>
                </div>
            </header>

            {/* Main Chat Container */}
            <div className="chat-container">
                {/* Messages Area */}
                <div className="messages-area">
                    {messagesLoading ? (
                        <div className="messages-loading">
                            <div className="loading-shimmer" />
                            <div className="loading-shimmer short" />
                            <div className="loading-shimmer" />
                        </div>
                    ) : isNewChat ? (
                        <div className="welcome-state">
                            <div className="welcome-icon">
                                <Sparkles size={32} />
                            </div>
                            <h2>How can I help you today?</h2>
                            <p>I'm DJ-AI, your intelligent wealth advisor. Ask me about your portfolio, market trends, or investment strategies.</p>


                        </div>
                    ) : (
                        <div className="messages-list">
                            {messages.map((message) => (
                                <ChatMessage
                                    key={message.id}
                                    message={message}
                                    isStreaming={streamingMessageId === message.id}
                                />
                            ))}

                            {/* Typing indicator */}
                            {isSending && streamingMessageId === null && (
                                <div className="typing-indicator">
                                    <div className="typing-avatar">
                                        <Bot size={16} />
                                    </div>
                                    <div className="typing-content">
                                        <span className="typing-text">DJ-AI is typing</span>
                                        <div className="typing-dots">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <ChatInput
                    onSend={handleSendMessage}
                    isLoading={isSending}
                />
            </div>

            {/* History Drawer Overlay */}
            {isHistoryOpen && (
                <div
                    className="drawer-overlay"
                    onClick={() => setIsHistoryOpen(false)}
                />
            )}

            {/* History Drawer */}
            <aside className={`history-drawer ${isHistoryOpen ? 'open' : ''}`}>
                <div className="drawer-header">
                    <h2>
                        <History size={16} />
                        History
                    </h2>
                    <button
                        className="drawer-close"
                        onClick={() => setIsHistoryOpen(false)}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="drawer-sessions">
                    {sessionsLoading ? (
                        <div className="sessions-loading">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="session-skeleton" />
                            ))}
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="sessions-empty">
                            <FileText size={24} />
                            <p>No conversations yet</p>
                        </div>
                    ) : (
                        filteredSessions.map((session) => (
                            <button
                                key={session.id}
                                className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
                                onClick={() => handleSelectSession(session.id)}
                            >
                                <FileText size={16} className="session-icon" />
                                <div className="session-info">
                                    <span className="session-title">{session.title}</span>
                                    <span className="session-date">{formatSessionMeta(session.updatedAt)}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <div className="drawer-footer">
                    <button className="new-chat-btn" onClick={handleNewChat}>
                        <Plus size={18} />
                        <span>Start New Chat</span>
                    </button>
                </div>
            </aside>
        </div>
    );
};

export default Advisor;
