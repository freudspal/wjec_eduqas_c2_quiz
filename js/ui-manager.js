const UIManager = {
    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },
    renderQuestion() {
        const t = window.QZ.activeTask;
        const q = t.q;
        const ao = t.type.split('_')[0];
        let inputHtml = `<textarea id="qAns" class="tarea" placeholder="Type answer here..."></textarea>`;
        
        if (t.type === 'AO1_MC') {
            inputHtml = `<div class="grid-2">${q.mc.options.map((opt, i) => `<button class="opt-btn" data-ans="${opt}">${opt}</button>`).join('')}</div><input type="hidden" id="qAns">`;
        } else if (t.type === 'AO1_TF') {
            inputHtml = `<div class="grid-2"><button class="opt-btn" data-ans="true">True</button><button class="opt-btn" data-ans="false">False</button></div><input type="hidden" id="qAns">`;
        }

        document.getElementById('qContent').innerHTML = `
            <div class="q-tag"><span class="ao-badge">${ao}</span> 🐾 ${q.tag}</div>
            <div class="q-prompt">${t.prompt}</div>
            <div class="q-main">${t.type === 'AO2_SCEN' ? q.scenario : (t.type === 'AO1_DEF' ? q.concept : q.definition)}</div>
            ${(t.type !== 'AO2_SCEN' && q.scenario) ? `<button class="btn btn-o btn-s" id="hintBtn">Get Hint 🐾</button><div id="qHint" class="q-hint-box">${q.scenario}</div>` : ''}
            ${inputHtml}<div id="qFeedback" class="fb-box"></div>`;

        document.querySelectorAll('.opt-btn').forEach(b => b.onclick = () => { document.getElementById('qAns').value = b.dataset.ans; handleCheck(); });
        const hb = document.getElementById('hintBtn'); if(hb) hb.onclick = () => { document.getElementById('qHint').style.display='block'; hb.style.display='none'; };
        const ta = document.getElementById('qAns'); if(ta) ta.focus();
    }
};
