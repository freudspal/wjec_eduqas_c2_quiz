window.Checker = window.Checker || {
    clean(s) { 
        if(!s) return '';
        return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(); 
    },

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
        
        console.log(`🔍 [Checker] Verifying: "${studentAns}" for Concept: "${task.q.concept}"`);

        // --- STAGE 1: Strict / Stem Match ---
        if (input === target || this.stem(input) === this.stem(target)) {
            console.log("✅ [Checker] Stage 1 Match: Strict/Stem equality.");
            return { ok: true, feedback: "Perfect match!" };
        }

        // --- STAGE 2: Proximity / Substring ---
        if (target.length > 4 && input.length > 4) {
            if (target.includes(input) || input.includes(target)) {
                console.log("✅ [Checker] Stage 2 Match: Substring proximity.");
                return { ok: true, feedback: "Partial match" };
            }
        }

        // --- STAGE 3: Database Check ---
        const approved = window.APPROVED[task.q.concept] || [];
        if (approved.some(a => this.clean(a) === input || this.stem(a) === this.stem(input))) {
            console.log("✅ [Checker] Stage 3 Match: Found in Approved Database.");
            return { ok: true, feedback: "Database match" };
        }

        // --- STAGE 4: AI Check (Final) ---
        console.log("🤖 [Checker] No local match. Requesting AI verification...");
        
        try {
            const ai = await ApiClient.call('AI_CHECK', { 
            type: task.type, 
            concept: task.q.concept, 
            target: task.target, // This ensures Gemini knows what to mark against
            studentAnswer: studentAns 
            });

            console.log("📡 [Checker] AI Response received:", ai);

            if (ai.correct) {
                console.log("✅ [Checker] AI Approved the answer.");
                // Stage 5: Auto-Learn
                if (!task.type.includes('AO3')) {
                    console.log("🧠 [Checker] Adding answer to auto-learn queue...");
                    ApiClient.call('ADD_APPROVED', { concept: task.q.concept, answer: studentAns });
                }
                return { ok: true, feedback: ai.feedback };
            } else {
                console.log("❌ [Checker] AI Rejected the answer.");
                return { ok: false, feedback: ai.feedback };
            }
        } catch (err) {
            console.error("🚨 [Checker] AI Call Failed:", err);
            return { ok: false, feedback: "Marking service error. Please tell your teacher." };
        }
    }
};
