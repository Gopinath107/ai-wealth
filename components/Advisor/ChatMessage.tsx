
import React from 'react';
import { User, Bot, Sparkles, CornerDownRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessageData, InstrumentQuote } from '../../services/aiChatService';
import PriceChart from './PriceChart';

interface ChatMessageProps {
    message: ChatMessageData;
    isStreaming?: boolean;
    followUps?: string[] | null;
    instrumentKeys?: string[] | null;
    instrumentQuotes?: InstrumentQuote[] | null;   // ← NEW rich metadata
    onFollowUpClick?: (question: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
    message,
    isStreaming,
    followUps,
    instrumentKeys,
    instrumentQuotes,
    onFollowUpClick,
}) => {
    const isUser = message.role === 'user';
    const [isCopied, setIsCopied] = React.useState(false);
    const [isThinkingExpanded, setIsThinkingExpanded] = React.useState(false);

    const formatTime = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata',
        });
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    // Extract thinking process and strip follow-up section
    const processContent = (content: string) => {
        let processed = content;

        const thinkMatch = processed.match(/<think>([\s\S]*?)<\/think>/);
        let thinking: string | null = null;
        if (thinkMatch) {
            thinking = thinkMatch[1].trim();
            processed = processed.replace(/<think>[\s\S]*?<\/think>/, '').trim();
        }

        const followUpPatterns = [
            /\n#{1,3}\s*Follow[-\u2010\u2011\u2012\u2013\u2014\s]?[Uu]ps?(?:\s+[Qq]uestions?)?[\s\S]*/i,
            /\n\*\*Follow[-\u2010\u2011\u2012\u2013\u2014\s]?[Uu]ps?(?:\s+[Qq]uestions?)?\*\*[\s\S]*/i,
            /\nFollow[-\u2010\u2011\u2012\u2013\u2014\s]?[Uu]ps?(?:\s+[Qq]uestions?)?\n[\s\S]*/i,
        ];
        for (const pattern of followUpPatterns) {
            processed = processed.replace(pattern, '').trim();
        }

        return { thinking, actualResponse: processed };
    };

    const { thinking, actualResponse } = processContent(message.content);

    // Determine whether to show the chart:
    // prefer instrumentQuotes (rich) but fall back to raw keys for backward compat
    const hasChart = !isUser && !isStreaming &&
        ((instrumentQuotes && instrumentQuotes.length > 0) ||
         (instrumentKeys && instrumentKeys.length > 0));

    return (
        <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
            <div className={`message-avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`}>
                {isUser ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`message-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
                <div className="message-content">
                    {isUser ? (
                        <p>{message.content}</p>
                    ) : (
                        <>
                            {thinking && (
                                <div className="thinking-block">
                                    <button
                                        className="thinking-toggle"
                                        onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                                    >
                                        <Sparkles size={12} />
                                        <span>{isThinkingExpanded ? 'Hide thinking process' : 'Show thinking process'}</span>
                                    </button>
                                    {isThinkingExpanded && (
                                        <div className="thinking-content-text">{thinking}</div>
                                    )}
                                </div>
                            )}
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: ({ children }) => <h1 className="md-h1">{children}</h1>,
                                    h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
                                    h3: ({ children }) => <h3 className="md-h3">{children}</h3>,
                                    p:  ({ children }) => <p  className="md-p">{children}</p>,
                                    ul: ({ children }) => <ul className="md-ul">{children}</ul>,
                                    ol: ({ children }) => <ol className="md-ol">{children}</ol>,
                                    li: ({ children }) => <li className="md-li">{children}</li>,
                                    code: ({ children, className }: any) => {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !className ? (
                                            <code className="md-code-inline">{children}</code>
                                        ) : (
                                            <div className="md-code-block-container">
                                                {match && <span className="md-code-lang">{match[1]}</span>}
                                                <pre className="md-pre">
                                                    <code className={className}>{children}</code>
                                                </pre>
                                            </div>
                                        );
                                    },
                                    blockquote: ({ children }) => <blockquote className="md-blockquote">{children}</blockquote>,
                                    strong: ({ children }) => <strong className="md-strong">{children}</strong>,
                                    em: ({ children }) => <em className="md-em">{children}</em>,
                                    table: ({ children }) => (
                                        <div className="md-table-wrapper">
                                            <table className="md-table">{children}</table>
                                        </div>
                                    ),
                                    thead: ({ children }) => <thead className="md-thead">{children}</thead>,
                                    tbody: ({ children }) => <tbody>{children}</tbody>,
                                    tr:   ({ children }) => <tr   className="md-tr">{children}</tr>,
                                    th:   ({ children }) => <th   className="md-th">{children}</th>,
                                    td:   ({ children }) => <td   className="md-td">{children}</td>,
                                    hr: () => <hr className="md-hr" />,
                                }}
                            >
                                {actualResponse}
                            </ReactMarkdown>
                        </>
                    )}
                    {isStreaming && <span className="streaming-cursor" />}
                </div>

                {/* Price Chart — always driven by instrumentQuotes when available */}
                {hasChart && (
                    <PriceChart
                        instrumentKeys={instrumentKeys || []}
                        instrumentQuotes={instrumentQuotes || null}
                    />
                )}

                {/* Follow-up Buttons */}
                {!isUser && !isStreaming && followUps && followUps.length > 0 && (
                    <div className="follow-ups-container">
                        <div className="follow-ups-label">Follow-ups</div>
                        <div className="follow-ups-list">
                            {followUps.map((question, index) => (
                                <button
                                    key={index}
                                    className="follow-up-btn"
                                    onClick={() => onFollowUpClick?.(question)}
                                >
                                    <CornerDownRight size={14} className="follow-up-icon" />
                                    <span>{question}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="message-footer">
                    <span className="message-time">{formatTime(message.createdAt)}</span>
                    {!isUser && !isStreaming && (
                        <button
                            className={`copy-btn ${isCopied ? 'copied' : ''}`}
                            onClick={handleCopy}
                            title="Copy message"
                        >
                            {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatMessage;
