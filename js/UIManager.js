const UIManager = {
    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    renderDashboard() {
        const S = window.S;
        const acc = calcAcc(S.totalCorrect, S.totalAnswered, S.totalSkipped);
        document.getElementById('uNick').textContent = S.nickname;
        document.getElementById('uMeta').textContent = `Y${S.year} · Grp ${S.group} · T:${S.teacher}`;
        document.getElementById('totalPbar').style.width = acc + "%";
        document.getElementById('uAccuracy').textContent = `Accuracy: ${acc}%`;
        document.getElementById('uAnswered').textContent = `${S.totalAnswered} Answered`;

        const tags = [...new Set(window.QUESTIONS.map(q => q.tag))];
        const grid = document.getElementById('topicGrid');
        grid.innerHTML = "";
        
        tags.forEach(tag => {
            const qs = window.QUESTIONS.filter(q => q.tag === tag);
            let tC=0, tA=0, tSk=0;
            qs.forEach(q => {
                const st = S.termStats[q.concept] || {correct:0, answered:0, skipped:0};
                tC += st.correct; tA += st.answered; tSk += st.skipped;
            });
            const pct = calcAcc(tC, tA, tSk);
            grid.innerHTML += `
                <div class="card clickable" onclick="startQuiz('all', '${tag}')">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <b>${tag}</b><span>${pct}%</span>
                    </div>
                    <div class="pbar-container" style="height:4px;"><div class="pbar-fill" style="width:${pct}%; background:${pct>=75?'var(--gr)':pct>=50?'var(--am)':'var(--re)'}"></div></div>
                </div>`;
        });
    },

    renderQuestion() {
        const task = window.QZ.activeTask;
        const q = task.q;
        const ao = task.type.split('_')[0];
        
        document.getElementById('qContent').innerHTML = `
            <div class="q-tag"><span class="ao-badge">${ao}</span> 🐾 ${q.tag}</div>
            <div class="q-prompt">${task.prompt}</div>
            <div class="q-main">${task.type === 'AO2_SCEN' ? q.scenario : (task.type === 'AO1_DEF' ? q.concept : q.definition)}</div>
            ${(task.type !== 'AO2_SCEN' && q.scenario) ? `
                <button class="btn btn-o btn-s" id="hintBtn" onclick="document.getElementById('qHint').style.display='block'; this.style.display='none'">Get Hint 🐾</button>
                <div id="qHint" class="q-hint-box">${q.scenario}</div>
            ` : ''}
            <input type="text" id="qAns" class="tarea" placeholder="Type here..." autocomplete="off">
            <div id="qFeedback" class="fb-box"></div>
        `;
        document.getElementById('qAns').focus();
    }
};

function calcAcc(c, a, s) { 
    const tw = (a || 0) + ((s || 0) * 0.5);
    return tw === 0 ? 0 : Math.round((c / tw) * 100);
}