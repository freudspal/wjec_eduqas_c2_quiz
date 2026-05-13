window.UIManager = window.UIManager || {
    // 1. Utility for Accuracy (Prevents NaN%)
    calcAcc(c, a, s) {
        const correct = parseInt(c) || 0;
        const answered = parseInt(a) || 0;
        const skipped = parseInt(s) || 0;
        // Skip counts as 0.5 weight for negative accuracy
        const totalWeight = answered + (skipped * 0.5);
        return totalWeight === 0 ? 0 : Math.round((correct / totalWeight) * 100);
    },

    // 2. Screen Navigator
    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) target.classList.add('active');
    },

    // 3. Renders the Home Screen Stats & Topics
    renderDashboard() {
        const S = window.S;
        // STOP if no data (prevents crash)
        if (!S) return console.error("UIManager: No student data found.");

        // The Fail-Safe Helper: checks if element exists before updating
        const safeSet = (id, val, isWidth = false) => {
            const el = document.getElementById(id);
            if (el) {
                if (isWidth) el.style.width = val;
                else el.textContent = val;
            }
        };

        const acc = this.calcAcc(S.totalCorrect, S.totalAnswered, S.totalSkipped);

        // Update the Top Banner
        safeSet('uNick', S.nickname || S.name);
        safeSet('uMeta', `Y${S.year || 1} • Grp ${S.group || 'A'} • T:${S.teacher || 'J'}`);
        safeSet('totalPbar', acc + "%", true); 
        safeSet('uAccuracy', `Accuracy: ${acc}%`);
        safeSet('uAnswered', `${S.totalAnswered || 0} Ans`);

        // Counters for the RAG summary cards
        let g = 0, a = 0, r = 0;

        // Rebuild the Topic Grid
        const grid = document.getElementById('topicGrid');
        if (grid) {
            grid.innerHTML = "";
            const tags = [...new Set(window.QUESTIONS.map(q => q.tag))].sort();

            tags.forEach(tag => {
                const qs = window.QUESTIONS.filter(q => q.tag === tag);
                let tC = 0, tA = 0, tS = 0;

                qs.forEach(q => {
                    const st = S.termStats[q.concept] || { correct: 0, answered: 0, skipped: 0 };
                    tC += (st.correct || 0); tA += (st.answered || 0); tS += (st.skipped || 0);
                });

                const pct = this.calcAcc(tC, tA, tS);
                
                // Only count topics that have been attempted for the summary
                if (tA > 0) {
                    if (pct >= 75) g++; else if (pct >= 50) a++; else r++;
                }

                const color = pct >= 75 ? 'var(--gr)' : pct >= 50 ? 'var(--am)' : 'var(--re)';
                const cardId = `topic-${tag.replace(/[^a-z0-9]/gi, '')}`;

                // Create and append the topic card
                const card = document.createElement('div');
                card.className = "card clickable";
                card.id = cardId;
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <b style="font-size:0.95rem;">${tag}</b>
                        <span style="font-size:0.8rem; font-weight:700; color:${color}">${tA > 0 ? pct + '%' : 'NEW'}</span>
                    </div>
                    <div class="pbar-container" style="height:5px;">
                        <div class="pbar-fill" style="width:${pct}%; background:${color}"></div>
                    </div>
                    <div style="font-size:0.65rem; color:var(--mu); margin-top:4px;">
                        ${qs.length} terms &middot; ${tA} attempted
                    </div>
                `;
                card.onclick = () => startQuiz('all', tag);
                grid.appendChild(card);
            });
        }

        // Update the RAG counters at the top
        safeSet('statG', g);
        safeSet('statA', a);
        safeSet('statR', r);
    },

    // 4. Renders the Quiz Question UI
    renderQuestion() {
        const t = window.QZ.activeTask;
        if (!t) return;
        const q = t.q;
        const ao = t.type.split('_')[0];
        
        let inputHtml = `<textarea id="qAns" class="tarea" placeholder="Type answer here..." autocomplete="off"></textarea>`;
        
        // Handle Multiple Choice or True/False Task Types
        if (t.type === 'AO1_MC') {
            inputHtml = `<div class="grid-2">${q.mc.options.map(opt => `<button class="btn btn-o btn-s opt-btn" data-ans="${opt}">${opt}</button>`).join('')}</div><input type="hidden" id="qAns">`;
        } else if (t.type === 'AO1_TF') {
            inputHtml = `<div class="grid-2"><button class="btn btn-o opt-btn" data-ans="true">True</button><button class="btn btn-o opt-btn" data-ans="false">False</button></div><input type="hidden" id="qAns">`;
        }

        document.getElementById('qContent').innerHTML = `
            <div class="q-tag"><span class="ao-badge">${ao}</span> 🐾 ${q.tag}</div>
            <div class="q-prompt" style="font-size:0.9rem; color:var(--mu); margin-bottom:10px;">${t.prompt}</div>
            <div class="q-main">${t.type === 'AO2_SCEN' ? q.scenario : (t.type === 'AO1_DEF' ? q.concept : q.definition)}</div>
            ${(t.type !== 'AO2_SCEN' && q.scenario) ? `
                <button class="btn btn-o btn-s" id="hintBtn" style="margin-bottom:15px;">Get Hint 🐾</button>
                <div id="qHint" class="q-hint-box" style="display:none;">${q.scenario}</div>
            ` : ''}
            ${inputHtml}<div id="qFeedback" class="fb-box"></div>`;

        // Bind Multiple Choice / True-False buttons
        document.querySelectorAll('.opt-btn').forEach(b => {
            b.onclick = () => { 
                document.getElementById('qAns').value = b.getAttribute('data-ans'); 
                window.submitChoice(b.getAttribute('data-ans')); // Calls global helper in index.html
            };
        });

        // Bind Hint Button
        const hb = document.getElementById('hintBtn');
        if (hb) {
            hb.onclick = () => {
                const hintBox = document.getElementById('qHint');
                if (hintBox) hintBox.style.display = 'block';
                hb.style.display = 'none';
            };
        }

        const ta = document.getElementById('qAns');
        if (ta && ta.type !== 'hidden') ta.focus();
    }
};
