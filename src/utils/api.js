export const BASE_URL = "https://courseapi-production-3751.up.railway.app";
export const GRAPHQL_URL = `${BASE_URL}/graphql`;
export const ALIVE_URL = `${BASE_URL}/alive`;

export const checkAlive = async (setLoading, setLastError) => {
    try {
        if (setLoading) setLoading(true);
        const res = await fetch(ALIVE_URL);
        if (!res.ok) throw new Error("Service responded but not OK");
        return true;
    } catch {
        if (setLastError) setLastError("Service is unreachable");
        return false;
    } finally {
        if (setLoading) setLoading(false);
    }
};

export const toGqlStringArray = (arr = []) => `[${arr.map((val) => JSON.stringify(val)).join(", ")}]`;
