
import React from 'react';
import { User, Bot, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessageData } from '../../services/aiChatService';

interface ChatMessageProps {
    message: ChatMessageData;
    isStreaming?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming }) => {
    const isUser = message.role === 'user';
    const [isCopied, setIsCopied] = React.useState(false);
    const [isThinkingExpanded, setIsThinkingExpanded] = React.useState(false);

    const formatTime = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    // Extract thinking process if it exists (e.g., <think>...</think>)
    const processContent = (content: string) => {
        const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
        if (thinkMatch) {
            const thinking = thinkMatch[1].trim();
            const actualResponse = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
            return { thinking, actualResponse };
        }
        return { thinking: null, actualResponse: content };
    };

    const { thinking, actualResponse } = processContent(message.content);

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
                                        <div className="thinking-content-text">
                                            {thinking}
                                        </div>
                                    )}
                                </div>
                            )}
                            <ReactMarkdown
                                components={{
                                    h1: ({ children }) => <h1 className="md-h1">{children}</h1>,
                                    h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
                                    h3: ({ children }) => <h3 className="md-h3">{children}</h3>,
                                    p: ({ children }) => <p className="md-p">{children}</p>,
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
                                    table: ({ children }) => <table className="md-table">{children}</table>,
                                    thead: ({ children }) => <thead className="md-thead">{children}</thead>,
                                    tbody: ({ children }) => <tbody>{children}</tbody>,
                                    tr: ({ children }) => <tr className="md-tr">{children}</tr>,
                                    th: ({ children }) => <th className="md-th">{children}</th>,
                                    td: ({ children }) => <td className="md-td">{children}</td>,
                                    hr: () => <hr className="md-hr" />,
                                }}
                            >
                                {actualResponse}
                            </ReactMarkdown>
                        </>
                    )}
                    {isStreaming && <span className="streaming-cursor" />}
                </div>

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
