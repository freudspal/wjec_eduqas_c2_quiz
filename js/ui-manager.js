const UIManager = {
    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if(target) target.classList.add('active');
    },

    renderDashboard() {
        const S = window.S;
        const acc = calcAcc(S.totalCorrect, S.totalAnswered, S.totalSkipped);
        document.getElementById('uNick').textContent = S.nickname;
        document.getElementById('uMeta').textContent = `Y${S.year} · Grp ${S.group} · T:${S.teacher}`;
        document.getElementById('totalPbar').style.width = acc + "%";
        document.getElementById('uAccuracy').textContent = `Accuracy: ${acc}%`;
        document.getElementById('uAnswered').textContent = `${S.totalAnswered} Ans`;

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
            const cardId = `topic-${tag.replace(/\s/g, '')}`;
            
            grid.innerHTML += `
                <div class="card clickable" id="${cardId}">
                    <div class="flex-between mb-10">
                        <b>${tag}</b><span>${pct}%</span>
                    </div>
                    <div class="pbar-container" style="height:4px;"><div class="pbar-fill" style="width:${pct}%; background:${pct>=75?'var(--gr)':pct>=50?'var(--am)':'var(--re)'}"></div></div>
                </div>`;
            
            // Re-add listener for dynamic cards
            setTimeout(() => {
                document.getElementById(cardId).addEventListener('click', () => startQuiz('all', tag));
            }, 0);
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
                <button class="btn btn-o btn-s" id="hintBtn">Get Hint 🐾</button>
                <div id="qHint" class="q-hint-box">${q.scenario}</div>
            ` : ''}
            <input type="text" id="qAns" class="tarea" placeholder="Type answer here..." autocomplete="off">
            <div id="qFeedback" class="fb-box"></div>
        `;

        const hb = document.getElementById('hintBtn');
        if(hb) hb.addEventListener('click', () => {
            document.getElementById('qHint').style.display = 'block';
            hb.style.display = 'none';
        });

        document.getElementById('qAns').focus();
    }
};
