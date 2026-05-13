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
        if (!S) return;

        // Update Header Banner
        const acc = this.calcAcc(S.totalCorrect, S.totalAnswered, S.totalSkipped);
        document.getElementById('uNick').textContent = S.nickname;
        document.getElementById('uMeta').textContent = `Y${S.year || 1} • Group ${S.group || 'A'} • T:${S.teacher || 'J'}`;
        document.getElementById('totalPbar').style.width = acc + "%";
        document.getElementById('uAccuracy').textContent = `Accuracy: ${acc}%`;
        document.getElementById('uAnswered').textContent = `${S.totalAnswered || 0} Ans`;

        // Reset Topic Grid
        const grid = document.getElementById('topicGrid');
        if (!grid) return;
        grid.innerHTML = "";
        
        const tags = [...new Set(window.QUESTIONS.map(q => q.tag))].sort();
        
        let g=0, a=0, r=0; // RAG Counters

        tags.forEach(tag => {
            const qsInTopic = window.QUESTIONS.filter(q => q.tag === tag);
            let tC=0, tA=0, tS=0;
            
            qsInTopic.forEach(q => {
                const st = S.termStats[q.concept] || {correct:0, answered:0, skipped:0};
                tC += (st.correct || 0); tA += (st.answered || 0); tS += (st.skipped || 0);
            });

            const pct = this.calcAcc(tC, tA, tS);
            if (tA > 0) {
                if (pct >= 75) g++; else if (pct >= 50) a++; else r++;
            }

            const cardId = `topic-${tag.replace(/\s/g, '')}`;
            const color = pct >= 75 ? 'var(--gr)' : pct >= 50 ? 'var(--am)' : 'var(--re)';

            grid.innerHTML += `
                <div class="card clickable" id="${cardId}">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <b style="font-size:0.95rem;">${tag}</b>
                        <span style="font-size:0.8rem; font-weight:700; color:${color}">${tA > 0 ? pct + '%' : 'NEW'}</span>
                    </div>
                    <div class="pbar-container" style="height:5px;">
                        <div class="pbar-fill" style="width:${pct}%; background:${color}"></div>
                    </div>
                    <div style="font-size:0.65rem; color:var(--mu); margin-top:4px;">
                        ${qsInTopic.length} terms &middot; ${tA} attempted
                    </div>
                </div>`;
            
            // Wait for DOM to update then bind click
            setTimeout(() => {
                const el = document.getElementById(cardId);
                if (el) el.onclick = () => startQuiz('all', tag);
            }, 0);
        });

        // Update Dashboard Counters
        const sg = document.getElementById('statG'), sa = document.getElementById('statA'), sr = document.getElementById('statR');
        if (sg) sg.textContent = g;
        if (sa) sa.textContent = a;
        if (sr) sr.textContent = r;
    },

    // 4. Renders the Quiz Question UI
    renderQuestion() {
        const t = window.QZ.activeTask;
        if (!t) return;
        const q = t.q;
        const ao = t.type.split('_')[0];
        
        let inputHtml = `<textarea id="qAns" class="tarea" placeholder="Type answer here..." autocomplete="off"></textarea>`;
        
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
                handleCheck(); 
            };
        });

        // Bind Hint Button
        const hb = document.getElementById('hintBtn');
        if (hb) {
            hb.onclick = () => {
                document.getElementById('qHint').style.display = 'block';
                hb.style.display = 'none';
            };
        }

        const ta = document.getElementById('qAns');
        if (ta && ta.type !== 'hidden') ta.focus();
    }
};
