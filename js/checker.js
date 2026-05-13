const Checker = {
    clean(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, '').trim(); },
    async verify(task, studentAns) {
        const input = this.clean(studentAns);
        const target = this.clean(task.target);
        
        // Exact / Database Match
        if (input === target) return { ok: true };
        const approved = window.APPROVED[task.q.concept] || [];
        if (approved.some(a => this.clean(a) === input)) return { ok: true };

        // AI Check for definitions and AO3
        const ai = await ApiClient.call('AI_CHECK', { 
            type: task.type, concept: task.q.concept, 
            target: task.target, studentAnswer: studentAns 
        });
        if (ai.correct && !task.type.includes('AO3')) ApiClient.call('ADD_APPROVED', { concept: task.q.concept, answer: studentAns });
        return { ok: ai.correct, feedback: ai.feedback };
    }
};
