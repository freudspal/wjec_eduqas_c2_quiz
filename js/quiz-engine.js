window.QuizEngine = window.QuizEngine || {
    pool: [],

    // Logic to calculate accuracy for a specific term (internal helper)
    _getAcc(concept) {
        const S = window.S;
        if (!S || !S.termStats || !S.termStats[concept]) return 0;
        const st = S.termStats[concept];
        const totalWeight = (st.answered || 0) + ((st.skipped || 0) * 0.5);
        if (totalWeight === 0) return 0;
        return (st.correct / totalWeight) * 100;
    },

    unpack(questions) {
        let tasks = [];
        questions.forEach(q => {
            if (!q || !q.concept) return; // Skip empty rows

            // AO1 Tasks
            if (q.definition) tasks.push({ type: 'AO1_TERM', q, target: q.concept, prompt: "Identify the psychological term:" });
            if (q.concept) tasks.push({ type: 'AO1_DEF', q, target: q.definition, prompt: "Define this psychological term:" });
            if (q.mc && q.mc.options) tasks.push({ type: 'AO1_MC', q, target: q.mc.options[q.mc.correct], prompt: "Multiple Choice: Select the correct fact." });
            if (q.tf && q.tf.statement) tasks.push({ type: 'AO1_TF', q, target: q.tf.answer.toString(), prompt: "True or False?" });
            
            // AO2 Task
            if (q.scenario) tasks.push({ type: 'AO2_SCEN', q, target: q.concept, prompt: "Based on the scenario, identify the concept:" });
            
            // AO3 Tasks
            if (q.scenario_strength) tasks.push({ type: 'AO3_STR', q, target: q.scenario_strength, prompt: `Identify a STRENGTH of: ${q.concept}` });
            if (q.scenario_weakness) tasks.push({ type: 'AO3_WK', q, target: q.scenario_weakness, prompt: `Identify a WEAKNESS of: ${q.concept}` });
        });
        return tasks;
    },

    init(mode, tag = null) {
        let tasks = this.unpack(window.QUESTIONS);
        
        // 1. Filter by Topic/Tag if selected
        if (tag) {
            tasks = tasks.filter(t => t.q.tag === tag);
        }

        // 2. Filter for "Tricky" items (Accuracy < 50% or never attempted)
        if (mode === 'tricky') {
            tasks = tasks.filter(t => this._getAcc(t.q.concept) < 50);
            // If no tricky terms found, fallback to all to avoid blank screen
            if (tasks.length === 0) tasks = this.unpack(window.QUESTIONS);
        }

        // 3. Shuffle the pool
        this.pool = tasks.sort(() => Math.random() - 0.5);

        // 4. Set session length (Zen and Time trial are unlimited)
        if (mode !== 'zen' && mode !== 'time') {
            this.pool = this.pool.slice(0, 10);
        }

        // 5. Initialize Global Quiz State
        window.QZ = { 
            mode, 
            currentIdx: 0, 
            score: 0, 
            results: [], 
            activeTask: this.pool[0], 
            timer: null 
        };
    },

    next() {
        window.QZ.currentIdx++;
        
        // Handle end of pool
        if (window.QZ.currentIdx >= this.pool.length) {
            if (window.QZ.mode === 'zen' || window.QZ.mode === 'time') {
                // Reshuffle and keep going for Zen/Time modes
                this.pool = this.pool.sort(() => Math.random() - 0.5);
                window.QZ.currentIdx = 0;
            } else {
                return false; // Quiz finished
            }
        }

        window.QZ.activeTask = this.pool[window.QZ.currentIdx];
        return true;
    }
};
