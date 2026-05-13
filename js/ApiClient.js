const ApiClient = {
    async call(method, data = {}) {
        try {
            const res = await fetch("/api/jsonbin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ method, ...data })
            });
            if (!res.ok) throw new Error(`Server Error: ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API Error:", e);
            return { error: true, message: e.message };
        }
    }
};