
import { WS_BASE_URL, getToken, shouldUseBackend } from './apiConfig';
import { MarketEvent, WsCommand } from '../types';

type MessageHandler = (event: MarketEvent) => void;
type ConnectionHandler = () => void;

interface WebSocketServiceState {
    socket: WebSocket | null;
    isConnected: boolean;
    subscribedKeys: Set<string>;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    reconnectDelay: number;
    messageHandlers: Set<MessageHandler>;
    connectionHandlers: Set<ConnectionHandler>;
    disconnectionHandlers: Set<ConnectionHandler>;
}

const state: WebSocketServiceState = {
    socket: null,
    isConnected: false,
    subscribedKeys: new Set(),
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,
    messageHandlers: new Set(),
    connectionHandlers: new Set(),
    disconnectionHandlers: new Set(),
};

export const websocketService = {
    /**
     * Connect to the market WebSocket server
     */
    connect: (): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!shouldUseBackend()) {
                console.log('[WS] Demo mode - WebSocket disabled');
                resolve();
                return;
            }

            if (state.socket && state.isConnected) {
                resolve();
                return;
            }

            const token = getToken();
            if (!token) {
                console.warn('[WS] No JWT token available for WebSocket connection');
                reject(new Error('No authentication token'));
                return;
            }

            try {
                const wsUrl = `${WS_BASE_URL}/ws/market?token=${encodeURIComponent(token)}`;
                console.log('[WS] Connecting to:', wsUrl);

                state.socket = new WebSocket(wsUrl);

                state.socket.onopen = () => {
                    console.log('[WS] Connected successfully');
                    state.isConnected = true;
                    state.reconnectAttempts = 0;

                    // Re-subscribe to previously subscribed keys on reconnect
                    if (state.subscribedKeys.size > 0) {
                        websocketService.subscribe(Array.from(state.subscribedKeys), 'full');
                    }

                    state.connectionHandlers.forEach(handler => handler());
                    resolve();
                };

                state.socket.onmessage = (event) => {
                    try {
                        const data: MarketEvent = JSON.parse(event.data);
                        state.messageHandlers.forEach(handler => handler(data));
                    } catch (e) {
                        console.error('[WS] Failed to parse message:', e);
                    }
                };

                state.socket.onerror = (error) => {
                    console.error('[WS] WebSocket error:', error);
                };

                state.socket.onclose = (event) => {
                    console.log('[WS] Connection closed:', event.code, event.reason);
                    state.isConnected = false;
                    state.disconnectionHandlers.forEach(handler => handler());

                    // Attempt reconnection if not intentionally closed
                    if (event.code !== 1000 && state.reconnectAttempts < state.maxReconnectAttempts) {
                        state.reconnectAttempts++;
                        console.log(`[WS] Reconnecting in ${state.reconnectDelay}ms (attempt ${state.reconnectAttempts}/${state.maxReconnectAttempts})`);
                        setTimeout(() => websocketService.connect(), state.reconnectDelay);
                    }
                };

            } catch (e) {
                console.error('[WS] Failed to create WebSocket:', e);
                reject(e);
            }
        });
    },

    /**
     * Disconnect from WebSocket
     */
    disconnect: (): void => {
        if (state.socket) {
            state.socket.close(1000, 'Client disconnect');
            state.socket = null;
            state.isConnected = false;
            state.subscribedKeys.clear();
        }
    },

    /**
     * Subscribe to instrument keys for live updates
     */
    subscribe: (instrumentKeys: string[], mode: 'ltpc' | 'full' = 'full'): void => {
        if (!state.socket || !state.isConnected) {
            console.warn('[WS] Cannot subscribe - not connected');
            // Store keys for later subscription on connect
            instrumentKeys.forEach(key => state.subscribedKeys.add(key));
            return;
        }

        const command: WsCommand = {
            action: 'subscribe',
            mode,
            instrumentKeys
        };

        console.log('[WS] Subscribing to:', instrumentKeys);
        state.socket.send(JSON.stringify(command));
        instrumentKeys.forEach(key => state.subscribedKeys.add(key));
    },

    /**
     * Unsubscribe from instrument keys
     */
    unsubscribe: (instrumentKeys: string[]): void => {
        if (!state.socket || !state.isConnected) {
            instrumentKeys.forEach(key => state.subscribedKeys.delete(key));
            return;
        }

        const command: WsCommand = {
            action: 'unsubscribe',
            mode: 'full',
            instrumentKeys
        };

        console.log('[WS] Unsubscribing from:', instrumentKeys);
        state.socket.send(JSON.stringify(command));
        instrumentKeys.forEach(key => state.subscribedKeys.delete(key));
    },

    /**
     * Add a message handler for market events
     */
    onMessage: (handler: MessageHandler): (() => void) => {
        state.messageHandlers.add(handler);
        return () => state.messageHandlers.delete(handler);
    },

    /**
     * Add a connection handler
     */
    onConnect: (handler: ConnectionHandler): (() => void) => {
        state.connectionHandlers.add(handler);
        return () => state.connectionHandlers.delete(handler);
    },

    /**
     * Add a disconnection handler
     */
    onDisconnect: (handler: ConnectionHandler): (() => void) => {
        state.disconnectionHandlers.add(handler);
        return () => state.disconnectionHandlers.delete(handler);
    },

    /**
     * Check if connected
     */
    isConnected: (): boolean => {
        return state.isConnected;
    },

    /**
     * Get currently subscribed instrument keys
     */
    getSubscribedKeys: (): string[] => {
        return Array.from(state.subscribedKeys);
    }
};
