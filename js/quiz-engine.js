const QuizEngine = {
    pool: [],
    history: [],
    
    // Turns 1 JSON row into up to 5 different Task Objects
    unpack(questions) {
        let tasks = [];
        questions.forEach(q => {
            if (q.definition) tasks.push({ type: 'AO1_TERM', q, target: q.concept, prompt: "Identify the concept from the definition:" });
            if (q.concept) tasks.push({ type: 'AO1_DEF', q, target: q.definition, prompt: `Define this term:` });
            if (q.scenario) tasks.push({ type: 'AO2_SCEN', q, target: q.concept, prompt: "Based on this scenario, identify the concept:" });
            if (q.scenario_strength) tasks.push({ type: 'AO3_STR', q, target: q.scenario_strength, prompt: `Identify a strength of ${q.concept}:` });
            if (q.scenario_weakness) tasks.push({ type: 'AO3_WK', q, target: q.scenario_weakness, prompt: `Identify a weakness of ${q.concept}:` });
        });
        return tasks;
    },

    init(mode, tag = null) {
        let tasks = this.unpack(window.QUESTIONS);
        
        if (tag) tasks = tasks.filter(t => t.q.tag === tag);
        if (mode === 'tricky') {
            tasks = tasks.filter(t => {
                const stat = window.S.termStats[t.q.concept];
                return !stat || (stat.correct / (stat.answered || 1)) < 0.5;
            });
        }

        // Shuffle
        this.pool = tasks.sort(() => Math.random() - 0.5);
        if (mode !== 'zen' && mode !== 'time') this.pool = this.pool.slice(0, 10);
        
        window.QZ = { 
            mode, 
            currentIdx: 0, 
            score: 0, 
            results: [], 
            activeTask: this.pool[0],
            startTime: Date.now() 
        };
    },

    next() {
        window.QZ.currentIdx++;
        if (window.QZ.currentIdx < this.pool.length) {
            window.QZ.activeTask = this.pool[window.QZ.currentIdx];
            return true;
        }
        return false;
    }
};
