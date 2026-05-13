window.UIManager = window.UIManager || {
    calcAcc(c, a, s) {
        const tw = (parseInt(a)||0) + (parseInt(s||0)*0.5);
        return tw === 0 ? 0 : Math.round((parseInt(c)||0) / tw * 100);
    },
    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) target.classList.add('active');
    },
    renderDashboard() {
        const S = window.S; if (!S) return;
        const safeSet = (id, val, isWidth = false) => {
            const el = document.getElementById(id);
            if (el) { if (isWidth) el.style.width = val; else el.textContent = val; }
        };
        const acc = this.calcAcc(S.totalCorrect, S.totalAnswered, S.totalSkipped);
        safeSet('uNick', S.nickname);
        safeSet('uMeta', `Y${S.year} • Grp ${S.group} • T:${S.teacher}`);
        safeSet('totalPbar', acc + "%", true);
        safeSet('uAccuracy', `${acc}% Acc`);
        safeSet('uAnswered', `${S.totalAnswered} Ans`);

        const grid = document.getElementById('topicGrid');
        if (grid) {
            grid.innerHTML = "";
            const tags = [...new Set(window.QUESTIONS.map(q => q.tag))].sort();
            let g=0, a=0, r=0;
            tags.forEach(tag => {
                const qs = window.QUESTIONS.filter(q => q.tag === tag);
                let tC=0, tA=0, tS=0;
                qs.forEach(q => { const st = S.termStats[q.concept] || {correct:0, answered:0, skipped:0}; tC+=st.correct; tA+=st.answered; tS+=st.skipped; });
                const pct = this.calcAcc(tC, tA, tS);
                if (tA > 0) { if(pct >= 75) g++; else if(pct >= 50) a++; else r++; }
                const color = pct >= 75 ? 'var(--gr)' : pct >= 50 ? 'var(--am)' : 'var(--re)';
                const card = document.createElement('div');
                card.className = "card clickable";
                card.innerHTML = `<div style="display:flex; justify-content:space-between;"><b>${tag}</b><span>${pct}%</span></div>
                    <div class="pbar-container" style="height:4px;"><div class="pbar-fill" style="width:${pct}%; background:${color}"></div></div>
                    <div style="font-size:0.6rem; color:var(--mu);">${qs.length} terms</div>`;
                card.onclick = () => startQuiz('all', tag);
                grid.appendChild(card);
            });
            safeSet('statG', g); safeSet('statA', a); safeSet('statR', r);
        }
    },
    renderQuestion() {
        const t = window.QZ.activeTask; if (!t) return;
        const q = t.q;
        const ao = t.type.split('_')[0];
        
        let displayPrompt = t.prompt;
        let displayMain = "";
        let hintText = q.scenario;

        // --- Targeted Display Logic ---
        if (t.type === 'AO1_TERM') {
            // "PERFECT" behavior for AO1: Big Definition
            displayMain = q.definition;
        } 
        else if (t.type === 'AO1_DEF') {
            // "PERFECT" behavior for AO1: Big Concept name
            displayMain = q.concept;
        } 
        else if (t.type === 'AO2_SCEN') {
            // "PERFECT" behavior for AO2: Big Scenario
            displayMain = q.scenario;
            hintText = ""; 
        } 
        else if (t.type.startsWith('AO3')) {
            // THE FIX: For AO3, move the Prompt ("Identify weakness...") to the Big Text
            // and hide the Definition text from the primary view.
            displayMain = t.prompt; 
            displayPrompt = "AO3 Evaluation Task:";
            hintText = q.definition; // Moved definition to the hint box
        }

        let inputHtml = `<textarea id="qAns" class="tarea" placeholder="Type answer here..." autocomplete="off"></textarea>`;
        if (t.type === 'AO1_MC') {
            inputHtml = `<div class="grid-2">${q.mc.options.map(opt => `<button class="btn btn-o btn-s" onclick="submitChoice('${opt}')">${opt}</button>`).join('')}</div><input type="hidden" id="qAns">`;
        } else if (t.type === 'AO1_TF') {
            inputHtml = `<div class="grid-2"><button class="btn btn-o" onclick="submitChoice('true')">True</button><button class="btn btn-o" onclick="submitChoice('false')">False</button></div><input type="hidden" id="qAns">`;
        }

        document.getElementById('qCount').textContent = `${window.QZ.currentIdx + 1}/10`;
        document.getElementById('qContent').innerHTML = `
            <div class="q-tag"><span class="ao-badge">${ao}</span> 🐾 ${q.tag}</div>
            <div class="q-prompt" style="font-size:0.9rem; color:var(--mu); margin-bottom:10px;">${displayPrompt}</div>
            <div class="q-main">${displayMain}</div>
            ${hintText ? `<button class="btn btn-o btn-s" id="hintBtn" onclick="document.getElementById('qHint').style.display='block'; this.style.display='none'">Get Hint 🐾</button><div id="qHint" class="q-hint-box">${hintText}</div>` : ''}
            ${inputHtml}<div id="qFeedback" class="fb-box"></div>`;
        
        const ta = document.getElementById('qAns'); if(ta && ta.type !== 'hidden') ta.focus();
    }
};
