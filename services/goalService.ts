
import { InvestmentGoal, Contribution } from '../types';
import { MOCK_GOALS, updateMockGoals } from './mockData';
import { BASE_URL, ENDPOINTS, getHeaders, simulateDelay, shouldUseBackend } from './apiConfig';

export const goalService = {
    // GET /goals?userId=X
    getAll: async (userId?: string | number): Promise<InvestmentGoal[]> => {
        if (shouldUseBackend()) {
            try {
                const url = userId ? `${BASE_URL}${ENDPOINTS.GOALS.GET}?userId=${userId}` : `${BASE_URL}${ENDPOINTS.GOALS.GET}`;
                const res = await fetch(url, { headers: getHeaders() });
                const data = await res.json();
                return data.result || [];
            } catch (e) { return []; }
        }
        await simulateDelay();
        return [...MOCK_GOALS];
    },

    // POST /goals
    add: async (goal: InvestmentGoal) => {
        if (shouldUseBackend()) {
            const res = await fetch(`${BASE_URL}${ENDPOINTS.GOALS.ADD}`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(goal)
            });
            const data = await res.json();
            if (!data.success) throw new Error('Failed to add goal');
            return data.result;
        }
        await simulateDelay(500);
        updateMockGoals([...MOCK_GOALS, goal]);
    },

    // PUT /goals/:id
    update: async (goal: InvestmentGoal) => {
        if (shouldUseBackend()) {
            const res = await fetch(`${BASE_URL}${ENDPOINTS.GOALS.UPDATE.replace(':id', goal.id)}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(goal)
            });
            const data = await res.json();
            if (!data.success) throw new Error('Failed to update goal');
            return data.result;
        }
        await simulateDelay(500);
        const idx = MOCK_GOALS.findIndex(g => g.id === goal.id);
        if (idx !== -1) {
            MOCK_GOALS[idx] = goal;
            updateMockGoals([...MOCK_GOALS]);
        }
    },

    // Add contribution to a goal (local + backend)
    // Add contribution to a goal (local + backend)
    addContribution: async (goalId: string, contribution: Contribution, userId?: string | number) => {
        if (shouldUseBackend()) {
            // Backend: update the entire goal with new contribution appended
            // We need userId to fetch the goal first if we don't have it
            if (!userId) throw new Error('UserId is required for backend updates');

            const allGoals = await goalService.getAll(userId);
            const target = allGoals.find(g => g.id === goalId);
            if (!target) throw new Error('Goal not found');

            target.contributions = [...(target.contributions || []), contribution];
            target.currentAmount = (target.currentAmount || 0) + contribution.amount;
            target.userId = Number(userId); // Ensure userId is set on the object

            return goalService.update(target);
        }
        await simulateDelay(300);
        const idx = MOCK_GOALS.findIndex(g => g.id === goalId);
        if (idx !== -1) {
            MOCK_GOALS[idx].contributions = [...(MOCK_GOALS[idx].contributions || []), contribution];
            MOCK_GOALS[idx].currentAmount += contribution.amount;
            updateMockGoals([...MOCK_GOALS]);
        }
    },

    // DELETE /goals/:id?userId=X
    remove: async (id: string, userId?: string | number) => {
        if (shouldUseBackend()) {
            const url = userId
                ? `${BASE_URL}${ENDPOINTS.GOALS.REMOVE.replace(':id', id)}?userId=${userId}`
                : `${BASE_URL}${ENDPOINTS.GOALS.REMOVE.replace(':id', id)}`;

            await fetch(url, {
                method: 'DELETE',
                headers: getHeaders()
            });
            return;
        }
        await simulateDelay(500);
        updateMockGoals(MOCK_GOALS.filter(g => g.id !== id));
    }
};
