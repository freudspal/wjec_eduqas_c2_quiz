window.UIManager = window.UIManager || {
    // 1. Utility for Accuracy (Prevents NaN%)
    calcAcc(c, a, s) {
        const correct = parseInt(c) || 0;
        const answered = parseInt(a) || 0;
        const skipped = parseInt(s) || 0;
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

        // Update Header Stats
        const acc = this.calcAcc(S.totalCorrect, S.totalAnswered, S.totalSkipped);
        document.getElementById('uNick').textContent = S.nickname;
        document.getElementById('uMeta').textContent = `Year ${S.year} • Group ${S.group} • Teacher ${S.teacher}`;
        document.getElementById('totalPbar').style.width = acc + "%";
        document.getElementById('uAccuracy').textContent = `Accuracy: ${acc}%`;
        document.getElementById('uAnswered').textContent = `${S.totalAnswered} Ans`;

        // Topic Grid Logic
        const tags = [...new Set(window.QUESTIONS.map(q => q.tag))].sort();
        const grid = document.getElementById('topicGrid');
        grid.innerHTML = "";
        
        let g=0, a=0, r=0; // RAG Counters

        tags.forEach(tag => {
            const qs = window.QUESTIONS.filter(q => q.tag === tag);
            let tC=0, tA=0, tS=0;
            
            qs.forEach(q => {
                const st = S.termStats[q.concept] || {correct:0, answered:0, skipped:0};
                tC += (st.correct || 0); tA += (st.answered || 0); tS += (st.skipped || 0);
            });

            const pct = this.calcAcc(tC, tA, tS);
            
            // Calculate RAG status for counts
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
                        ${qs.length} Terms Available
                    </div>
                </div>`;
            
            // Bind Click to card
            setTimeout(() => {
                const el = document.getElementById(cardId);
                if (el) el.onclick = () => startQuiz('all', tag);
            }, 0);
        });

        // Update the RAG Number Counters on Dashboard
        if (document.getElementById('statG')) document.getElementById('statG').textContent = g;
        if (document.getElementById('statA')) document.getElementById('statA').textContent = a;
        if (document.getElementById('statR')) document.getElementById('statR').textContent = r;
    },

    // 4. Renders the Quiz Question UI
    renderQuestion() {
        const t = window.QZ.activeTask;
        const q = t.q;
        const ao = t.type.split('_')[0];
        
        let inputHtml = `<textarea id="qAns" class="tarea" placeholder="Type answer here..." autocomplete="off"></textarea>`;
        
        if (t.type === 'AO1_MC') {
            inputHtml = `<div class="grid-2">${q.mc.options.map(opt => `<button class="opt-btn" data-ans="${opt}">${opt}</button>`).join('')}</div><input type="hidden" id="qAns">`;
        } else if (t.type === 'AO1_TF') {
            inputHtml = `<div class="grid-2"><button class="opt-btn" data-ans="true">True</button><button class="opt-btn" data-ans="false">False</button></div><input type="hidden" id="qAns">`;
        }

        document.getElementById('qContent').innerHTML = `
            <div class="q-tag"><span class="ao-badge">${ao}</span> 🐾 ${q.tag}</div>
            <div class="q-prompt" style="font-size:0.9rem; color:
