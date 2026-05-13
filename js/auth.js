window.Auth = window.Auth || {
    ADJ: ['Bold','Brave','Clever','Daring','Epic','Fierce','Golden','Happy','Jolly','Mighty','Noble','Quick','Rapid','Swift','Wise','Silent','Cosmic','Vibrant','Keen','Sharp','Mellow','Grand','Royal','Valiant','Steady','Witty','Bright','Cunning','Tenacious','Agile'],
    CAT: ['Lion','Tiger','Panther','Cougar','Leopard','Lynx','Cheetah','Jaguar','Wildcat','Tomcat','Serval','Ocelot','Caracal','Bobcat','Puma','Tabby','Calico','Siamese','Sphynx','Persian','Bengal','Manx','Ragdoll','Maltese','Burmese','Korat','Siberian','Savannah','Angora','Abyssinian'],

    // Generates a consistent cat-themed nickname based on the student's real name
    genNick(name) {
        if (!name) return "Mysterious Cat";
        let h = 0; 
        for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i);
        const a = Math.abs(h);
        const adj = this.ADJ[a % this.ADJ.length];
        const cat = this.CAT[Math.floor(a / this.ADJ.length) % this.CAT.length];
        return `${adj} ${cat}`;
    },

    // Checks if a student exists in the JSONBin
    async lookup(name) {
        try {
            const d = await ApiClient.call('GET_STUDENT', { name });
            if (d && d.student) {
                window.S = d.student; // Store student data globally
                return { exists: true, nickname: d.student.nickname };
            }
            return { exists: false };
        } catch (e) {
            console.error("Auth: Lookup failed", e);
            return { exists: false, error: true };
        }
    },

    // Creates a new student record with all profile details
    async signup(data) {
        const name = data.name.trim();
        
        // Construct the full student object
        window.S = {
            name: name,
            pin: data.pin,
            year: data.year || "1",
            group: data.group || "A",
            teacher: data.teacher || "J",
            nickname: this.genNick(name),
            totalAnswered: 0,
            totalCorrect: 0,
            totalSkipped: 0,
            termStats: {},
            lastSeen: Date.now()
        };

        try {
            const res = await ApiClient.call('PUT_STUDENT', { student: window.S });
            if (res && !res.error) {
                return { success: true };
            } else {
                throw new Error(res.message || "Server rejected signup");
            }
        } catch (e) {
            console.error("Auth: Signup failed", e);
            return { success: false, error: e.message };
        }
    }
};
