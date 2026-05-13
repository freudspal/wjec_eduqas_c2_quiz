const Auth = {
    ADJ: ['Bold','Brave','Clever','Daring','Epic','Fierce','Golden','Happy','Jolly','Mighty','Noble','Quick','Rapid','Swift','Wise'],
    CAT: ['Lion','Tiger','Panther','Cougar','Leopard','Lynx','Cheetah','Jaguar','Wildcat','Tomcat'],

    genNick(name) {
        let h = 0; 
        for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i);
        const a = Math.abs(h);
        return this.ADJ[a % this.ADJ.length] + ' ' + this.CAT[Math.floor(a / this.ADJ.length) % this.CAT.length];
    },

    async lookup(name) {
        const d = await ApiClient.call('GET_STUDENT', { name });
        if (d.student) {
            window.S = d.student;
            return { exists: true, nickname: d.student.nickname };
        }
        return { exists: false };
    },

    async signup(data) {
        window.S = {
            ...data,
            nickname: this.genNick(data.name),
            totalAnswered: 0, totalCorrect: 0, totalSkipped: 0, termStats: {}
        };
        return await ApiClient.call('PUT_STUDENT', { student: window.S });
    }
};