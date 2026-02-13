
import React, { useMemo } from 'react';
import { Plus, Search, MessageSquare, X } from 'lucide-react';
import { ChatSession } from '../../services/aiChatService';

interface ChatSidebarProps {
    sessions: ChatSession[];
    currentSessionId: number | null;
    isLoading: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onNewChat: () => void;
    onSelectSession: (sessionId: number) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
    sessions,
    currentSessionId,
    isLoading,
    searchQuery,
    onSearchChange,
    onNewChat,
    onSelectSession,
}) => {
    // Filter sessions based on search query
    const filteredSessions = useMemo(() => {
        if (!searchQuery.trim()) return sessions;
        const query = searchQuery.toLowerCase();
        return sessions.filter(session =>
            session.title.toLowerCase().includes(query)
        );
    }, [sessions, searchQuery]);

    // Format relative time
    const formatRelativeTime = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <aside className="chat-sidebar">
            {/* New Chat Button */}
            <button onClick={onNewChat} className="new-chat-btn">
                <Plus size={18} />
                <span>New Chat</span>
            </button>

            {/* Search */}
            <div className="sidebar-search">
                <div className="search-input-wrapper">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="search-input"
                    />
                    {searchQuery && (
                        <button onClick={() => onSearchChange('')} className="search-clear">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Sessions List */}
            <div className="sessions-list">
                {isLoading ? (
                    <div className="sessions-loading">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="session-skeleton" />
                        ))}
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="sessions-empty">
                        <MessageSquare size={24} className="opacity-40" />
                        {searchQuery ? (
                            <>
                                <p>No results found</p>
                                <p className="text-sm opacity-60">Try a different search term</p>
                            </>
                        ) : (
                            <>
                                <p>No conversations yet</p>
                                <p className="text-sm opacity-60">Start a new chat to begin</p>
                            </>
                        )}
                    </div>
                ) : (
                    filteredSessions.map((session) => (
                        <button
                            key={session.id}
                            onClick={() => onSelectSession(session.id)}
                            className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
                        >
                            <MessageSquare size={16} className="session-icon" />
                            <div className="session-content">
                                <span className="session-title">{session.title}</span>
                                <span className="session-date">{formatRelativeTime(session.updatedAt)}</span>
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="sidebar-footer">
                <div className="sidebar-brand">
                    <span className="brand-icon">🤖</span>
                    <span className="brand-text">DJ-AI Analyst</span>
                </div>
            </div>
        </aside>
    );
};

export default ChatSidebar;
