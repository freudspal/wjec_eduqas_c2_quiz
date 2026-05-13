window.QuizEngine = window.QuizEngine || {
    pool: [],
    unpack(questions) {
        let tasks = [];
        questions.forEach(q => {
            // AO1 Tasks
            if (q.definition) tasks.push({ type: 'AO1_TERM', q, target: q.concept, prompt: "Identify the psychological term:" });
            if (q.concept) tasks.push({ type: 'AO1_DEF', q, target: q.definition, prompt: "Define this psychological term:" });
            if (q.mc) tasks.push({ type: 'AO1_MC', q, target: q.mc.options[q.mc.correct], prompt: "Multiple Choice: Select the correct fact." });
            if (q.tf) tasks.push({ type: 'AO1_TF', q, target: q.tf.answer.toString(), prompt: "True or False?" });
            
            // AO2 Task
            if (q.scenario) tasks.push({ type: 'AO2_SCEN', q, target: q.concept, prompt: "Based on the scenario, identify the concept:" });
            
            // AO3 Tasks (Prompts updated for large display)
            if (q.scenario_strength) tasks.push({ type: 'AO3_STR', q, target: q.scenario_strength, prompt: `Identify a STRENGTH of: ${q.concept}` });
            if (q.scenario_weakness) tasks.push({ type: 'AO3_WK', q, target: q.scenario_weakness, prompt: `Identify a WEAKNESS of: ${q.concept}` });
        });
        return tasks;
    },
    init(mode, tag = null) {
        let tasks = this.unpack(window.QUESTIONS);
        if (tag) tasks = tasks.filter(t => t.q.tag === tag);
        if (mode === 'tricky') {
            const S = window.S;
            tasks = tasks.filter(t => {
                const st = S.termStats[t.q.concept] || {correct:0, answered:0, skipped:0};
                const tw = st.answered + (st.skipped * 0.5);
                const acc = tw === 0 ? 0 : (st.correct / tw) * 100;
                return acc < 50;
            });
        }
        this.pool = tasks.sort(() => Math.random() - 0.5);
        window.QZ = { mode, currentIdx: 0, score: 0, results: [], activeTask: this.pool[0], timer: null };
        if (mode !== 'zen' && mode !== 'time') this.pool = this.pool.slice(0, 10);
    },
    next() {
        window.QZ.currentIdx++;
        if (window.QZ.currentIdx >= this.pool.length) {
            if (window.QZ.mode === 'zen') {
                this.pool = this.pool.sort(() => Math.random() - 0.5);
                window.QZ.currentIdx = 0;
            } else return false;
        }
        window.QZ.activeTask = this.pool[window.QZ.currentIdx];
        return true;
    }
};
