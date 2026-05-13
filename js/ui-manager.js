window.UIManager = window.UIManager || {
    // 1. Accuracy Utility (Fixes NaN% and handle skips)
    calcAcc(c, a, s) {
        const correct = parseInt(c) || 0;
        const answered = parseInt(a) || 0;
        const skipped = parseInt(s) || 0;
        const totalWeight = answered + (skipped * 0.5);
        return totalWeight === 0 ? 0 : Math.round((correct / totalWeight) * 100);
    },

    // 2. Screen Switcher
    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) target.classList.add('active');
    },

    // 3. Dashboard Renderer (Topic Cards & RAG)
    renderDashboard() {
        const S = window.S;
        if (!S) return;

        const safeSet = (id, val, isWidth = false) => {
            const el = document.getElementById(id);
            if (el) {
                if (isWidth) el.style.width = val;
                else el.textContent = val;
            }
        };

        const acc = this.calcAcc(S.totalCorrect, S.totalAnswered, S.totalSkipped);
        safeSet('uNick', S.nickname);
        safeSet('uMeta', `Y${S.year || 1} • Grp ${S.group || 'A'} • T:${S.teacher || 'J'}`);
        safeSet('totalPbar', acc + "%", true);
        safeSet('uAccuracy', `${acc}% Acc`);
        safeSet('uAnswered', `${S.totalAnswered} Ans`);

        const grid = document.getElementById('topicGrid');
        if (grid) {
            grid.innerHTML = "";
            const tags = [...new Set(window.QUESTIONS.map(q => q.tag))].sort();
            let g = 0, a = 0, r = 0;

            tags.forEach(tag => {
                const qs = window.QUESTIONS.filter(q => q.tag === tag);
                let tC = 0, tA = 0, tS = 0;
                qs.forEach(q => {
                    const st = S.termStats[q.concept] || { correct: 0, answered: 0, skipped: 0 };
                    tC += st.correct; tA += st.answered; tS += st.skipped;
                });
                const pct = this.calcAcc(tC, tA, tS);
                if (tA > 0) { if (pct >= 75) g++; else if (pct >= 50) a++; else r++; }

                const color = pct >= 75 ? 'var(--gr)' : pct >= 50 ? 'var(--am)' : 'var(--re)';
                const card = document.createElement('div');
                card.className = "card clickable";
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                        <b>${tag}</b><span>${pct}%</span>
                    </div>
                    <div class="pbar-container" style="height:4px;"><div class="pbar-fill" style="width:${pct}%; background:${color}"></div></div>
                    <div style="font-size:0.65rem; color:var(--mu);">${qs.length} terms</div>
                `;
                card.onclick = () => startQuiz('all', tag);
                grid.appendChild(card);
            });
            safeSet('statG', g); safeSet('statA', a); safeSet('statR', r);
        }
    },

    // 4. Question Renderer (Dynamic AO Lettering)
    renderQuestion() {
        const t = window.QZ.activeTask;
        if (!t) return;
        const q = t.q;
        const ao = t.type.split('_')[0];

        let displayPrompt = t.prompt; // The small text
        let displayMain = "";        // The LARGE lettering
        let hintText = q.scenario;   // The content for hint box
        // --- UPDATE PROGRESS BAR ---
        const progressEl = document.getElementById('qPbar');
        if (progressEl) {
    // If Zen/Time mode, we use a fake 100-step progress, 
    // otherwise use the actual percentage of the 10 questions.
    const total = (window.QZ.mode === 'zen' || window.QZ.mode === 'time') ? 100 : window.QZ.questions.length;
    const pct = (window.QZ.currentIdx / total) * 100;
    progressEl.style.width = pct + '%';
}
        // --- Layout Selector based on Task Type ---
        if (t.type === 'AO1_TERM') {
            displayMain = q.definition;
        } else if (t.type === 'AO1_DEF') {
            displayMain = q.concept;
        } else if (t.type === 'AO1_MC') {
            displayMain = q.mc.question;
        } else if (t.type === 'AO1_TF') {
            displayMain = q.tf.statement;
        } else if (t.type === 'AO2_SCEN') {
            displayMain = q.scenario;
            hintText = ""; // No hints for scenario questions
        } else if (t.type.startsWith('AO3')) {
            // Task: "Identify a weakness of..." becomes the LARGE text
            displayMain = t.prompt;
            displayPrompt = "AO3 Evaluation Task:";
            hintText = q.definition; // Hint shows the definition
        }

        // --- Input Method Generation ---
        let inputHtml = `<textarea id="qAns" class="tarea" placeholder="Type answer here..." autocomplete="off"></textarea>`;
        if (t.type === 'AO1_MC') {
            inputHtml = `<div class="grid-2" style="margin-bottom:15px;">
                ${q.mc.options.map(opt => `<button class="btn btn-o" onclick="submitChoice('${opt.replace(/'/g, "\\'")}')">${opt}</button>`).join('')}
            </div><input type="hidden" id="qAns">`;
        } else if (t.type === 'AO1_TF') {
            inputHtml = `<div class="grid-2" style="margin-bottom:15px;">
                <button class="btn btn-o" onclick="submitChoice('true')">True</button>
                <button class="btn btn-o" onclick="submitChoice('false')">False</button>
            </div><input type="hidden" id="qAns">`;
        }

        // --- Inject into DOM ---
        document.getElementById('qCount').textContent = `${window.QZ.currentIdx + 1}/10`;
        document.getElementById('qContent').innerHTML = `
            <div class="q-tag"><span class="ao-badge">${ao}</span> 🐾 ${q.tag}</div>
            <div class="q-prompt" style="font-size:0.9rem; color:var(--mu); margin-bottom:10px;">${displayPrompt}</div>
            <div class="q-main">${displayMain}</div>
            ${hintText ? `<button class="btn btn-o btn-s" id="hintBtn" style="margin-bottom:15px;">Get Hint 🐾</button><div id="qHint" class="q-hint-box">${hintText}</div>` : ''}
            ${inputHtml}
            <div id="qFeedback" class="fb-box"></div>
        `;

        // --- RESET BUTTONS & ACTIONS ---
        const btnCheck = document.getElementById('btnCheck');
        const btnSkip = document.getElementById('btnSkip');
        const btnNext = document.getElementById('btnNext');

        if (btnCheck) {
            btnCheck.className = "btn btn-p"; // Remove stripes/thinking classes
            btnCheck.innerHTML = "Check Answer 😼";
            btnCheck.style.display = "flex";
            btnCheck.disabled = false;
        }
        if (btnSkip) {
            btnSkip.style.display = "flex";
            btnSkip.style.visibility = "visible";
        }
        if (btnNext) btnNext.style.display = "none";

        // Bind Hint Toggle
        const hb = document.getElementById('hintBtn');
        if (hb) hb.onclick = () => {
            const hBox = document.getElementById('qHint');
            if (hBox) hBox.style.display = 'block';
            hb.style.display = 'none';
        };

        const ta = document.getElementById('qAns');
        if (ta && ta.type !== 'hidden') ta.focus();
    }
};
