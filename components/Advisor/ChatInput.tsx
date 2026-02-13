
import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Paperclip } from 'lucide-react';

interface ChatInputProps {
    onSend: (message: string) => void;
    isLoading: boolean;
    placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
    onSend,
    isLoading,
    placeholder = 'Ask about your portfolio, markets, or investments...',
}) => {
    const [message, setMessage] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    }, [message]);

    const handleSubmit = () => {
        const trimmedMessage = message.trim();
        if (trimmedMessage && !isLoading) {
            onSend(trimmedMessage);
            setMessage('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="chat-input-container">
            <div className="input-wrapper">
                <button className="attach-btn" title="Add attachment">
                    <Paperclip size={20} />
                </button>
                <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="chat-textarea"
                    rows={1}
                    disabled={isLoading}
                />
                <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || isLoading}
                    className={`send-btn ${isLoading ? 'loading' : ''}`}
                    aria-label="Send message"
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
};

export default ChatInput;
