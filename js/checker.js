window.Checker = window.Checker || {
    // Improved cleaning: keeps spaces, removes symbols
    clean(s) { 
        if(!s) return '';
        return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(); 
    },

    // Handles singular/plural logic (Stemming)
    stem(s) {
        let word = this.clean(s);
        if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
        if (word.endsWith('es')) return word.slice(0, -2);
        if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
        return word;
    },

    async verify(task, studentAns) {
        const input = this.clean(studentAns);
        const target = this.clean(task.target);
        
        // 1. Strict Match OR Stemmed Match (Fixes Case Study/Studies)
        if (input === target || this.stem(input) === this.stem(target)) {
            return { ok: true, feedback: "Perfect match!" };
        }

        // 2. Proximity Check: If input is a significant part of target
        if (target.length > 4 && input.length > 4) {
            if (target.includes(input) || input.includes(target)) {
                return { ok: true, feedback: "Partial match" };
            }
        }

        // 3. Database Check
        const approved = window.APPROVED[task.q.concept] || [];
        if (approved.some(a => this.clean(a) === input || this.stem(a) === this.stem(input))) {
            return { ok: true, feedback: "Database match" };
        }

        // 4. AI Check (Final Stage)
        const ai = await ApiClient.call('AI_CHECK', { 
            type: task.type, 
            concept: task.q.concept, 
            target: task.target, 
            studentAnswer: studentAns 
        });
        
        if (ai.correct && !task.type.includes('AO3')) {
            ApiClient.call('ADD_APPROVED', { concept: task.q.concept, answer: studentAns });
        }
        return { ok: ai.correct, feedback: ai.feedback };
    }
};
