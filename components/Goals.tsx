import React, { useState, useEffect, useMemo, useRef } from 'react';
import { InvestmentGoal, GoalType, Contribution } from '../types';
import { createGoalPlan, ChatMsg } from '../services/geminiService';
import {
    Target, Plus, TrendingUp, Calendar, Trash2, Trophy, Loader2, Sparkles,
    Check, X, Flag, PieChart as PieChartIcon, Edit3, IndianRupee, Send, Bot,
    Clock, Landmark, ShoppingBag, PiggyBank,
    Shield, GraduationCap, Plane, Home, Heart, CreditCard, Zap, BarChart3,
    TrendingDown, AlertCircle
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';

// ─── CONSTANTS ────────────────────────────────────────────────────
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const GOAL_TYPES: GoalType[] = [
    'Retirement', 'Purchase', 'Savings', 'Emergency Fund',
    'Education', 'Vacation', 'House Down Payment', 'Wedding', 'Debt Payoff', 'Custom'
];

const GOAL_CONFIG: Record<GoalType, { icon: React.ElementType; gradient: string; bg: string; text: string }> = {
    'Retirement': { icon: Landmark, gradient: 'from-indigo-500 to-violet-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' },
    'Purchase': { icon: ShoppingBag, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
    'Savings': { icon: PiggyBank, gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' },
    'Emergency Fund': { icon: Shield, gradient: 'from-rose-500 to-red-600', bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400' },
    'Education': { icon: GraduationCap, gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
    'Vacation': { icon: Plane, gradient: 'from-sky-500 to-indigo-600', bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-600 dark:text-sky-400' },
    'House Down Payment': { icon: Home, gradient: 'from-amber-500 to-yellow-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
    'Wedding': { icon: Heart, gradient: 'from-pink-500 to-rose-600', bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400' },
    'Debt Payoff': { icon: CreditCard, gradient: 'from-slate-500 to-gray-600', bg: 'bg-slate-100 dark:bg-slate-800/30', text: 'text-slate-600 dark:text-slate-400' },
    'Custom': { icon: Sparkles, gradient: 'from-purple-500 to-fuchsia-600', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
};

// ─── HELPERS ──────────────────────────────────────────────────────
const getProjectionStatus = (goal: InvestmentGoal): { label: string; color: string; icon: React.ElementType; projectedDate: string } => {
    const remaining = goal.targetAmount - goal.currentAmount;
    if (remaining <= 0) return { label: 'Achieved', color: 'text-emerald-500', icon: Trophy, projectedDate: 'Done' };
    if (!goal.monthlyContribution || goal.monthlyContribution <= 0) return { label: 'No plan', color: 'text-slate-400', icon: AlertCircle, projectedDate: 'N/A' };
    const monthsNeeded = Math.ceil(remaining / goal.monthlyContribution);
    const projected = new Date();
    projected.setMonth(projected.getMonth() + monthsNeeded);
    const projectedStr = projected.toISOString().split('T')[0];
    const deadline = new Date(goal.deadline);
    if (projected <= deadline) return { label: 'On track', color: 'text-emerald-500', icon: TrendingUp, projectedDate: projectedStr };
    if (monthsNeeded <= Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)) * 1.2) return { label: 'Slightly behind', color: 'text-amber-500', icon: Clock, projectedDate: projectedStr };
    return { label: 'Behind', color: 'text-rose-500', icon: TrendingDown, projectedDate: projectedStr };
};

const formatCurrency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// ─── RADIAL PROGRESS SVG ─────────────────────────────────────────
const RadialProgress: React.FC<{ progress: number; size?: number; strokeWidth?: number; gradient: string }> = ({ progress, size = 80, strokeWidth = 6, gradient }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(progress, 100) / 100) * circumference;
    const gradientId = `radial-${gradient.replace(/\s/g, '')}`;
    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={gradient.includes('indigo') ? '#6366f1' : gradient.includes('emerald') ? '#10b981' : gradient.includes('amber') ? '#f59e0b' : gradient.includes('rose') ? '#f43f5e' : gradient.includes('blue') ? '#3b82f6' : gradient.includes('sky') ? '#0ea5e9' : gradient.includes('pink') ? '#ec4899' : gradient.includes('slate') ? '#64748b' : gradient.includes('purple') ? '#a855f7' : '#6366f1'} />
                    <stop offset="100%" stopColor={gradient.includes('violet') ? '#7c3aed' : gradient.includes('teal') ? '#14b8a6' : gradient.includes('orange') ? '#ea580c' : gradient.includes('red') ? '#dc2626' : gradient.includes('cyan') ? '#06b6d4' : gradient.includes('indigo') ? '#4f46e5' : gradient.includes('rose') ? '#e11d48' : gradient.includes('gray') ? '#374151' : gradient.includes('fuchsia') ? '#c026d3' : gradient.includes('yellow') ? '#eab308' : '#4f46e5'} />
                </linearGradient>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth={strokeWidth} fill="none" />
            <circle cx={size / 2} cy={size / 2} r={radius} stroke={`url(#${gradientId})`} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
        </svg>
    );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────
interface GoalsProps {
    totalPortfolioValue: number;
    userId?: string | number;
}

// ── Chat message type for the chatbot UI ────────────────────────
interface GoalChatMessage {
    role: 'user' | 'ai';
    text: string;
    suggestions?: string[];
    plan?: Partial<InvestmentGoal>;
}

const INITIAL_SUGGESTIONS = [
    { label: '🚗 Buy a Vehicle', prompt: 'I want to buy a car' },
    { label: '🏠 Buy Property', prompt: 'I want to buy a house' },
    { label: '💰 Build Savings', prompt: 'I want to build savings' },
    { label: '🎓 Education Fund', prompt: 'I want to save for education' },
];

const Goals: React.FC<GoalsProps> = ({ totalPortfolioValue: _totalPortfolioValue, userId }) => {
    const [goals, setGoals] = useState<InvestmentGoal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [detailGoal, setDetailGoal] = useState<InvestmentGoal | null>(null);
    const [contributionGoalId, setContributionGoalId] = useState<string | null>(null);
    const [contributionAmount, setContributionAmount] = useState('');
    const [contributionNote, setContributionNote] = useState('');

    // ── CHATBOT STATE ──
    const [chatMessages, setChatMessages] = useState<GoalChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState<Partial<InvestmentGoal> | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const conversationRef = useRef<ChatMsg[]>([]); // Groq conversation history

    // Edit form state (kept for edit modal)
    const [formData, setFormData] = useState({
        id: '', name: '', description: '', amount: '', currentAmount: '0', deadline: '',
        type: 'Savings' as GoalType, monthlyContribution: '', riskProfile: 'Moderate'
    });

    const [celebratingGoalId, setCelebratingGoalId] = useState<string | null>(null);

    // ── LOAD ─────────────────────────────────────────
    useEffect(() => {
        const loadGoals = async () => {
            setIsLoading(true);
            try {
                const data = await api.goals.getAll(userId);
                setGoals(data);
            } catch (e) { console.error('Failed to load goals', e); }
            finally { setIsLoading(false); }
        }; loadGoals();
    }, [userId]);

    useEffect(() => {
        if (!isLoading) {
            goals.forEach(g => {
                if (g.currentAmount >= g.targetAmount && !celebratingGoalId) {
                    setCelebratingGoalId(g.id);
                    setTimeout(() => setCelebratingGoalId(null), 5000);
                }
            });
        }
    }, [goals, isLoading, celebratingGoalId]);

    // ── SUMMARY STATS ────────────────────────────────
    const stats = useMemo(() => {
        const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
        const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
        const onTrack = goals.filter(g => getProjectionStatus(g).label === 'On track' || getProjectionStatus(g).label === 'Achieved').length;
        return { totalTarget, totalSaved, onTrack, count: goals.length };
    }, [goals]);

    // ── CHATBOT: auto-scroll ──────────────────────────
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, isAiThinking]);

    // ── CHATBOT: send message ───────────────────────
    const sendChatMessage = async (text: string) => {
        if (!text.trim()) return;
        // Add user message to UI
        setChatMessages(prev => [...prev, { role: 'user', text }]);
        setChatInput('');
        setIsAiThinking(true);

        // Add to conversation history
        conversationRef.current.push({ role: 'user', content: text });

        try {
            const result = await createGoalPlan([...conversationRef.current], userId);
            if (result) {
                // Add AI response to conversation history
                const aiContent = result.question || JSON.stringify(result);
                conversationRef.current.push({ role: 'assistant', content: aiContent });

                if (result.question) {
                    // AI is asking a question
                    setChatMessages(prev => [...prev, {
                        role: 'ai',
                        text: result.question!,
                        suggestions: result.suggestions || []
                    }]);
                } else {
                    // AI generated a plan
                    setGeneratedPlan(result);
                    setChatMessages(prev => [...prev, {
                        role: 'ai',
                        text: `Here's your personalized plan for **${result.name}**! Review the details below.`,
                        plan: result
                    }]);
                }
            } else {
                setChatMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I couldn\'t process that. Please try again.' }]);
            }
        } catch (err) {
            console.error('Chat failed', err);
            setChatMessages(prev => [...prev, { role: 'ai', text: 'Something went wrong. Please try again.' }]);
        } finally {
            setIsAiThinking(false);
        }
    };

    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendChatMessage(chatInput);
    };

    const handleSuggestionClick = (suggestion: string) => {
        sendChatMessage(suggestion);
    };

    const handleConfirmPlan = async () => {
        if (!generatedPlan) return;
        const finalGoal: InvestmentGoal = {
            id: Date.now().toString(),
            userId: userId,
            name: generatedPlan.name || 'New Goal',
            description: generatedPlan.description || '',
            targetAmount: generatedPlan.targetAmount || 0,
            currentAmount: generatedPlan.currentAmount || 0,
            deadline: generatedPlan.deadline || new Date().toISOString(),
            type: (generatedPlan.type as GoalType) || 'Savings',
            monthlyContribution: generatedPlan.monthlyContribution || 0,
            riskProfile: generatedPlan.riskProfile || 'Moderate',
            allocationStrategy: generatedPlan.allocationStrategy || [],
            milestones: generatedPlan.milestones || [],
            contributions: [],
        };
        await saveGoal(finalGoal);
        resetModal();
    };

    // ── MANUAL / EDIT SUBMIT ─────────────────────────
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.amount) return;
        const goal: InvestmentGoal = {
            id: formData.id || Date.now().toString(),
            userId: userId, // Add userId to new goals
            name: formData.name,
            description: formData.description,
            targetAmount: parseFloat(formData.amount),
            currentAmount: parseFloat(formData.currentAmount) || 0,
            deadline: formData.deadline || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            type: formData.type,
            monthlyContribution: parseFloat(formData.monthlyContribution) || 0,
            riskProfile: formData.riskProfile || 'Moderate',
            allocationStrategy: [],
            milestones: [],
            contributions: [],
        };
        if (modalMode === 'edit') {
            // Preserve existing contributions & allocation
            const existing = goals.find(g => g.id === goal.id);
            if (existing) {
                goal.contributions = existing.contributions;
                goal.allocationStrategy = existing.allocationStrategy;
                goal.milestones = existing.milestones;
            }
            await updateGoal(goal);
        } else {
            await saveGoal(goal);
        }
        resetModal();
    };

    // ── CRUD ─────────────────────────────────────────
    const saveGoal = async (goal: InvestmentGoal) => {
        try {
            await api.goals.add(goal);
            setGoals(await api.goals.getAll(userId));
        } catch (e) { console.error('[Goals] Add failed:', e); }
    };

    const updateGoal = async (goal: InvestmentGoal) => {
        try {
            await api.goals.update(goal);
            setGoals(await api.goals.getAll(userId));
        } catch (e) { console.error('[Goals] Update failed:', e); }
    };

    const removeGoal = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this goal?')) return;
        try {
            await api.goals.remove(id, userId);
            setGoals(prev => prev.filter(g => g.id !== id));
        } catch (e) { console.error('[Goals] Remove failed:', e); }
    };

    const handleAddContribution = async (goalId: string) => {
        const amount = parseFloat(contributionAmount);
        if (!amount || amount <= 0) return;
        const contribution: Contribution = {
            id: Date.now().toString(),
            amount,
            date: new Date().toISOString().split('T')[0],
            note: contributionNote || undefined,
        };
        try {
            await api.goals.addContribution(goalId, contribution, userId);
            setGoals(await api.goals.getAll(userId));
            setContributionGoalId(null);
            setContributionAmount('');
            setContributionNote('');
        } catch (e) { console.error('[Goals] Contribution failed:', e); }
    };

    // ── MODAL HELPERS ────────────────────────────────
    const openEditModal = (goal: InvestmentGoal) => {
        setModalMode('edit');
        setFormData({
            id: goal.id, name: goal.name, description: goal.description || '',
            amount: goal.targetAmount.toString(), currentAmount: goal.currentAmount.toString(),
            deadline: goal.deadline, type: goal.type,
            monthlyContribution: goal.monthlyContribution?.toString() || '',
            riskProfile: goal.riskProfile || 'Moderate',
        });
        setIsModalOpen(true);
    };

    const resetModal = () => {
        setIsModalOpen(false);
        setGeneratedPlan(null);
        setChatMessages([]);
        setChatInput('');
        conversationRef.current = [];
        setModalMode('add');
        setFormData({ id: '', name: '', description: '', amount: '', currentAmount: '0', deadline: '', type: 'Savings', monthlyContribution: '', riskProfile: 'Moderate' });
    };

    // ─── RENDER ────────────────────────────────────────────────────
    return (
        <div className="space-y-8 animate-fade-in relative pb-10">
            {/* ── Celebration confetti ── */}
            {celebratingGoalId && (
                <div className="fixed inset-0 pointer-events-none z-[100]">
                    <div className="absolute inset-0 overflow-hidden">
                        {[...Array(50)].map((_, i) => (
                            <div key={i} className="absolute w-2 h-2 rounded-full animate-[fall_3s_ease-in-out_infinite]" style={{
                                left: `${Math.random() * 100}%`, top: `-${Math.random() * 20}%`,
                                backgroundColor: CHART_COLORS[Math.floor(Math.random() * CHART_COLORS.length)],
                                animationDelay: `${Math.random() * 2}s`, animationDuration: `${2 + Math.random() * 3}s`
                            }} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Investment Strategy Planner</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">AI-powered strategy plans, savings tracking & goal projections.</p>
                </div>
                <button onClick={() => { setModalMode('add'); setIsModalOpen(true); }} disabled={isLoading}
                    className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-3 rounded-2xl hover:shadow-lg hover:shadow-indigo-200 dark:hover:shadow-none font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    New Strategy Plan
                </button>
            </div>

            {/* ── Summary Stats Bar ── */}
            {!isLoading && goals.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Goals', value: stats.count.toString(), icon: Target, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20' },
                        { label: 'Total Saved', value: formatCurrency(stats.totalSaved), icon: IndianRupee, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20' },
                        { label: 'Total Target', value: formatCurrency(stats.totalTarget), icon: BarChart3, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
                        { label: 'On Track', value: `${stats.onTrack}/${stats.count}`, icon: TrendingUp, color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-50 dark:bg-violet-900/20' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-all">
                            <div className={`${s.bgColor} p-2.5 rounded-xl`}>
                                <s.icon className={`w-5 h-5 ${s.color}`} />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{s.label}</p>
                                <p className="text-lg font-black text-slate-900 dark:text-white">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══ ADD (CHATBOT) / EDIT MODAL ═══ */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 relative">
                        <button onClick={resetModal} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 z-10 cursor-pointer"><X className="w-6 h-6" /></button>

                        {/* ── EDIT MODE HEADER ── */}
                        {modalMode === 'edit' && (
                            <div className="px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2"><Edit3 className="w-5 h-5 text-indigo-500" /> Edit Goal</h3>
                            </div>
                        )}

                        {/* ── AI CHATBOT (ADD MODE) ── */}
                        {modalMode === 'add' && (
                            <div className="flex flex-col h-[80vh]">
                                {/* Chat header */}
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">AI Goal Planner</h3>
                                        <p className="text-xs text-slate-400">Powered by DJ-AI</p>
                                    </div>
                                </div>

                                {/* Chat messages area */}
                                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                                    {/* Initial state: show welcome + suggestion cards */}
                                    {chatMessages.length === 0 && !isAiThinking && (
                                        <div className="flex flex-col items-center text-center py-8 space-y-6">
                                            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                                                <Sparkles className="w-8 h-8 text-indigo-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">What's your financial goal?</h3>
                                                <p className="text-sm text-slate-400 max-w-sm">Choose an option below or type your own goal</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                                                {INITIAL_SUGGESTIONS.map((s, i) => (
                                                    <button key={i} onClick={() => handleSuggestionClick(s.prompt)}
                                                        className="p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left cursor-pointer group">
                                                        <span className="text-2xl block mb-1">{s.label.split(' ')[0]}</span>
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{s.label.split(' ').slice(1).join(' ')}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Chat bubbles */}
                                    {chatMessages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] ${msg.role === 'user'
                                                ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-3'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl rounded-bl-md px-4 py-3'}`}>
                                                <p className="text-sm font-medium whitespace-pre-wrap">{msg.text}</p>

                                                {/* Suggestion chips */}
                                                {msg.suggestions && msg.suggestions.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {msg.suggestions.map((s, j) => (
                                                            <button key={j} onClick={() => handleSuggestionClick(s)}
                                                                className="px-3 py-1.5 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer">
                                                                {s}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Inline plan preview */}
                                                {msg.plan && (
                                                    <div className="mt-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                        <div className={`p-4 bg-gradient-to-r ${GOAL_CONFIG[(msg.plan.type as GoalType) || 'Custom'].gradient} text-white`}>
                                                            <p className="font-black text-lg">{msg.plan.name}</p>
                                                            <div className="flex items-center gap-3 text-white/80 text-xs mt-1">
                                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {msg.plan.deadline}</span>
                                                                <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {formatCurrency(msg.plan.targetAmount || 0)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="p-4 space-y-3">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Monthly Save</p>
                                                                    <p className="text-base font-black text-slate-900 dark:text-white">{formatCurrency(msg.plan.monthlyContribution || 0)}</p>
                                                                </div>
                                                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Risk</p>
                                                                    <p className="text-base font-black text-indigo-600 dark:text-indigo-400">{msg.plan.riskProfile}</p>
                                                                </div>
                                                            </div>
                                                            {/* Allocation */}
                                                            {msg.plan.allocationStrategy && msg.plan.allocationStrategy.length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {msg.plan.allocationStrategy.map((a, k) => (
                                                                        <span key={k} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-full text-[11px] font-bold">
                                                                            {a.assetClass} {a.percentage}%
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {/* Milestones */}
                                                            {msg.plan.milestones && msg.plan.milestones.length > 0 && (
                                                                <ul className="space-y-1">
                                                                    {msg.plan.milestones.map((m, k) => (
                                                                        <li key={k} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300 items-start">
                                                                            <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{k + 1}</div>
                                                                            {m}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                            <button onClick={handleConfirmPlan}
                                                                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2">
                                                                <Check className="w-4 h-4" /> Save this Plan
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* AI thinking indicator */}
                                    {isAiThinking && (
                                        <div className="flex justify-start">
                                            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                                <span className="text-sm text-slate-500 font-medium">Thinking...</span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Chat input */}
                                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                                    <form onSubmit={handleChatSubmit} className="flex gap-2">
                                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                                            disabled={isAiThinking}
                                            placeholder="Type your goal or answer here..."
                                            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-sm font-medium text-slate-900 dark:text-white transition-all" />
                                        <button type="submit" disabled={isAiThinking || !chatInput.trim()}
                                            className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg cursor-pointer">
                                            {isAiThinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* ── EDIT FORM ── */}
                        {modalMode === 'edit' && (
                            <div className="p-8 overflow-y-auto">
                                <form onSubmit={handleFormSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Goal Name</label>
                                        <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white" placeholder="e.g. Dream Vacation" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Description (optional)</label>
                                        <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white" placeholder="A brief description of your goal" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Target Amount</label>
                                            <input type="number" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white" placeholder="50000" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Current Amount</label>
                                            <input type="number" value={formData.currentAmount} onChange={e => setFormData({ ...formData, currentAmount: e.target.value })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white" placeholder="0" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Deadline</label>
                                            <input type="date" required value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Monthly Contribution</label>
                                            <input type="number" value={formData.monthlyContribution} onChange={e => setFormData({ ...formData, monthlyContribution: e.target.value })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white" placeholder="500" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Goal Type</label>
                                            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as GoalType })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white">
                                                {GOAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Risk Profile</label>
                                            <select value={formData.riskProfile} onChange={e => setFormData({ ...formData, riskProfile: e.target.value })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white">
                                                {['Conservative', 'Moderate', 'Aggressive'].map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold mt-4 hover:opacity-90 shadow-lg cursor-pointer transition-all">
                                        Save Changes
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ GOAL CARDS ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="relative rounded-3xl animate-pulse h-96 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800" />
                        <div className="relative p-6 space-y-4">
                            <div className="flex gap-4 items-center">
                                <div className="w-14 h-14 bg-slate-200/80 dark:bg-slate-700/80 rounded-2xl" />
                                <div className="space-y-2 flex-1"><div className="h-3 w-1/4 bg-slate-200/80 dark:bg-slate-700/80 rounded-full" /><div className="h-5 w-2/3 bg-slate-200/80 dark:bg-slate-700/80 rounded-full" /></div>
                            </div>
                            <div className="h-24 bg-slate-200/60 dark:bg-slate-700/60 rounded-2xl" />
                            <div className="grid grid-cols-2 gap-3"><div className="h-16 bg-slate-200/60 dark:bg-slate-700/60 rounded-xl" /><div className="h-16 bg-slate-200/60 dark:bg-slate-700/60 rounded-xl" /></div>
                            <div className="h-10 bg-slate-200/60 dark:bg-slate-700/60 rounded-xl" />
                        </div>
                    </div>
                )) : goals.map((goal, goalIndex) => {
                    const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                    const isComplete = progress >= 100;
                    const config = GOAL_CONFIG[goal.type] || GOAL_CONFIG['Custom'];
                    const IconComp = config.icon;
                    const projection = getProjectionStatus(goal);
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const ProjIcon = projection.icon;
                    const isContributing = contributionGoalId === goal.id;
                    const remaining = goal.targetAmount - goal.currentAmount;

                    return (
                        <div key={goal.id}
                            className="group relative rounded-3xl transition-all duration-500"
                            style={{ animationDelay: `${goalIndex * 80}ms` }}>

                            {/* Animated gradient border glow on hover */}
                            <div className={`absolute -inset-[1px] rounded-3xl bg-gradient-to-r ${config.gradient} opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500`} />
                            <div className={`absolute -inset-[1px] rounded-3xl bg-gradient-to-r ${config.gradient} opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />

                            {/* Card body */}
                            <div className={`relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl border overflow-hidden flex flex-col h-full
                                ${isComplete
                                    ? 'border-emerald-200/80 dark:border-emerald-700/40'
                                    : 'border-slate-200/60 dark:border-slate-800/60 group-hover:border-transparent'}
                                transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1`}>

                                {/* Top gradient accent strip */}
                                <div className={`h-1 bg-gradient-to-r ${config.gradient} opacity-80`} />

                                {/* Decorative gradient orb (top-right corner) */}
                                <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${config.gradient} opacity-[0.04] dark:opacity-[0.06] group-hover:opacity-[0.08] dark:group-hover:opacity-[0.12] transition-opacity duration-500 blur-2xl`} />

                                <div className="p-6 flex flex-col flex-1 relative">
                                    {/* Top row: icon + title + actions */}
                                    <div className="flex items-start justify-between mb-5">
                                        <div className="flex items-center gap-3.5">
                                            {/* Glowing icon orb */}
                                            <div className={`relative`}>
                                                <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} rounded-2xl blur-md opacity-30 group-hover:opacity-50 transition-opacity`} />
                                                <div className={`relative ${config.bg} p-3 rounded-2xl border border-white/50 dark:border-slate-700/50 group-hover:scale-110 transition-transform duration-300`}>
                                                    <IconComp className={`w-5 h-5 ${config.text}`} />
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">{goal.type}</span>
                                                <h3 className="font-black text-[17px] text-slate-900 dark:text-white tracking-tight leading-tight mt-0.5">{goal.name}</h3>
                                            </div>
                                        </div>
                                        {/* Floating action buttons */}
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                                            <button onClick={() => openEditModal(goal)} className="p-2 rounded-xl text-slate-300 dark:text-slate-600 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all cursor-pointer">
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => removeGoal(goal.id)} className="p-2 rounded-xl text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all cursor-pointer">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {goal.description && <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 line-clamp-2 leading-relaxed">{goal.description}</p>}

                                    {/* Progress section with enhanced layout */}
                                    <div className="flex items-center gap-5 mb-5">
                                        <div className="relative flex-shrink-0">
                                            <RadialProgress progress={progress} gradient={config.gradient} />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                {isComplete ? (
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center animate-pulse">
                                                        <Trophy className="w-4 h-4 text-emerald-500" />
                                                    </div>
                                                ) : (
                                                    <span className="text-sm font-black text-slate-900 dark:text-white">{Math.round(progress)}%</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-2xl font-black text-slate-900 dark:text-white truncate tracking-tight">{formatCurrency(goal.currentAmount)}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">of {formatCurrency(goal.targetAmount)}</p>
                                            {/* Linear progress bar */}
                                            <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                                                <div className={`h-full rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-1000 ease-out relative`}
                                                    style={{ width: `${Math.min(progress, 100)}%` }}>
                                                    {/* Shimmer effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                                                </div>
                                            </div>
                                            {!isComplete && remaining > 0 && (
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                                                    {formatCurrency(remaining)} remaining
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Enhanced quick stats */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/40 dark:to-slate-800/20 rounded-xl p-3 border border-slate-100/80 dark:border-slate-700/30">
                                            <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Monthly</p>
                                            <p className="text-[13px] font-bold text-slate-800 dark:text-white mt-0.5 truncate">{formatCurrency(goal.monthlyContribution || 0)}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/40 dark:to-slate-800/20 rounded-xl p-3 border border-slate-100/80 dark:border-slate-700/30">
                                            <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Risk</p>
                                            <p className="text-[13px] font-bold text-slate-800 dark:text-white mt-0.5">{goal.riskProfile || 'N/A'}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/40 dark:to-slate-800/20 rounded-xl p-3 border border-slate-100/80 dark:border-slate-700/30">
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <ProjIcon className={`w-3 h-3 ${projection.color}`} />
                                                <span className={`text-[11px] font-bold ${projection.color}`}>{projection.label}</span>
                                            </div>
                                            {projection.projectedDate !== 'Done' && projection.projectedDate !== 'N/A' && (
                                                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{formatDate(projection.projectedDate)}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Add Contribution button */}
                                    {!isComplete && (
                                        <div className="mb-3">
                                            {!isContributing ? (
                                                <button onClick={() => setContributionGoalId(goal.id)}
                                                    className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border
                                                        bg-gradient-to-r hover:${config.gradient} text-indigo-600 dark:text-indigo-400
                                                        bg-indigo-50/80 dark:bg-indigo-900/15 border-indigo-100 dark:border-indigo-800/30
                                                        hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-indigo-200/50 dark:hover:shadow-none`}>
                                                    <IndianRupee className="w-3.5 h-3.5" /> Log Savings
                                                </button>
                                            ) : (
                                                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/10 rounded-xl p-3 space-y-2 animate-fade-in border border-indigo-100/60 dark:border-indigo-800/30">
                                                    <div className="flex gap-2">
                                                        <input type="number" value={contributionAmount} onChange={e => setContributionAmount(e.target.value)} placeholder="Amount"
                                                            className="flex-1 p-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none transition-all" />
                                                        <button onClick={() => handleAddContribution(goal.id)}
                                                            className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-indigo-200/50 transition-all cursor-pointer">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => { setContributionGoalId(null); setContributionAmount(''); setContributionNote(''); }}
                                                            className="px-2 py-2 text-slate-400 hover:text-slate-600 cursor-pointer">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <input type="text" value={contributionNote} onChange={e => setContributionNote(e.target.value)} placeholder="Note (optional)"
                                                        className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none transition-all" />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* View Strategy button */}
                                    <button onClick={() => setDetailGoal(goal)}
                                        className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-auto rounded-xl hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10">
                                        <BarChart3 className="w-3.5 h-3.5" /> View Strategy
                                    </button>

                                    {/* Footer */}
                                    <div className="pt-4 flex items-center justify-between mt-auto border-t border-slate-100/80 dark:border-slate-800/50">
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                            <Calendar className="w-3.5 h-3.5" /> {formatDate(goal.deadline)}
                                        </div>
                                        {isComplete ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-700/30">
                                                <Trophy className="w-3 h-3" /> Completed
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-full border border-indigo-200/60 dark:border-indigo-700/30">
                                                <Zap className="w-3 h-3" /> Active
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ═══ DETAIL STRATEGY PANEL (Modal Overlay) ═══ */}
            {detailGoal && (() => {
                const dg = detailGoal;
                const dgConfig = GOAL_CONFIG[dg.type] || GOAL_CONFIG['Custom'];
                const DgIcon = dgConfig.icon;
                const dgProgress = Math.min((dg.currentAmount / dg.targetAmount) * 100, 100);
                const dgProjection = getProjectionStatus(dg);
                const DgProjIcon = dgProjection.icon;
                return (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setDetailGoal(null)}>
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                            {/* Gradient header */}
                            <div className={`p-6 bg-gradient-to-r ${dgConfig.gradient} text-white relative`}>
                                <button onClick={() => setDetailGoal(null)} className="absolute top-4 right-4 p-2 text-white/70 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="bg-white/20 p-2 rounded-xl"><DgIcon className="w-5 h-5" /></div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-white/70">{dg.type}</span>
                                </div>
                                <h3 className="text-2xl font-black">{dg.name}</h3>
                                {dg.description && <p className="text-white/70 text-sm mt-1">{dg.description}</p>}
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Progress summary */}
                                <div className="flex items-center gap-5">
                                    <div className="relative flex-shrink-0">
                                        <RadialProgress progress={dgProgress} size={90} gradient={dgConfig.gradient} />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-lg font-black text-slate-900 dark:text-white">{Math.round(dgProgress)}%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(dg.currentAmount)}</p>
                                        <p className="text-xs text-slate-400 font-bold">of {formatCurrency(dg.targetAmount)} target</p>
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <DgProjIcon className={`w-3.5 h-3.5 ${dgProjection.color}`} />
                                            <span className={`text-xs font-bold ${dgProjection.color}`}>{dgProjection.label}</span>
                                            {dgProjection.projectedDate !== 'Done' && dgProjection.projectedDate !== 'N/A' && (
                                                <span className="text-[10px] text-slate-400 ml-1">→ {formatDate(dgProjection.projectedDate)}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Strategy stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-3 text-center">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Monthly Plan</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(dg.monthlyContribution || 0)}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-3 text-center">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Risk Level</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{dg.riskProfile || 'N/A'}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-3 text-center">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Deadline</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{formatDate(dg.deadline)}</p>
                                    </div>
                                </div>

                                {/* Allocation Strategy */}
                                {dg.allocationStrategy && dg.allocationStrategy.length > 0 && (
                                    <div>
                                        <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <PieChartIcon className="w-3.5 h-3.5 text-indigo-500" /> Recommended Allocation
                                        </h4>
                                        <div className="bg-slate-50 dark:bg-slate-800/20 rounded-2xl p-4 flex items-center gap-6">
                                            <div className="w-28 h-28 flex-shrink-0">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RePieChart>
                                                        <Pie data={dg.allocationStrategy as any[]} dataKey="percentage" nameKey="assetClass" cx="50%" cy="50%" outerRadius={44} innerRadius={24} stroke="none">
                                                            {dg.allocationStrategy.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                                                        </Pie>
                                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }} />
                                                    </RePieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {dg.allocationStrategy.map((a, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-xs">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                                        <span className="text-slate-600 dark:text-slate-300">{a.assetClass} <span className="font-bold">{a.percentage}%</span></span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Milestones */}
                                {dg.milestones && dg.milestones.length > 0 && (
                                    <div>
                                        <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <Flag className="w-3.5 h-3.5 text-indigo-500" /> Strategy Milestones
                                        </h4>
                                        <ul className="space-y-2">
                                            {dg.milestones.map((m, i) => (
                                                <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300 items-start">
                                                    <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                                                    {m}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Savings / Contribution History */}
                                {dg.contributions && dg.contributions.length > 0 && (
                                    <div>
                                        <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-emerald-500" /> Savings History
                                        </h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {dg.contributions.slice(0, 10).map((c, i) => (
                                                <div key={c.id || i} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-xl">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        <span className="text-slate-500 dark:text-slate-400">{formatDate(c.date)}</span>
                                                        {c.note && <span className="text-slate-400 dark:text-slate-500 italic">— {c.note}</span>}
                                                    </div>
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(c.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default Goals;