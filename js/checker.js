const Checker = {
    clean(str) { return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim(); },

    async verify(task, studentAns) {
        const input = this.clean(studentAns);
        const target = this.clean(task.target);

        // Stage 1: Fuzzy Keyword Match (for definitions)
        const targetWords = target.split(' ').filter(w => w.length > 3);
        const inputWords = input.split(' ');
        const matches = targetWords.filter(w => inputWords.includes(w));

        // If it's a term identification (AO1/AO2), be strict
        if (task.type.includes('TERM') || task.type.includes('SCEN')) {
            if (input === target) return { ok: true, feedback: "Direct Match" };
            // Database Check
            const approved = window.APPROVED[task.q.concept] || [];
            if (approved.some(a => this.clean(a) === input)) return { ok: true, feedback: "Database Match" };
        } else {
            // For definitions/AO3, accept 3+ keywords
            if (matches.length >= 3) return { ok: true, feedback: "Keyword Match" };
        }

        // Stage 3: AI Fallback
        const ai = await ApiClient.call('AI_CHECK', {
            type: task.type,
            concept: task.q.concept,
            target: task.target,
            studentAnswer: studentAns
        });

        if (ai.correct) {
            // Stage 4: Auto-Learn (only for AO1/AO2 term naming)
            if (task.type.includes('TERM')) ApiClient.call('ADD_APPROVED', { concept: task.q.concept, answer: studentAns });
            return { ok: true, feedback: ai.feedback };
        }

        return { ok: false, feedback: ai.feedback };
    }
};
