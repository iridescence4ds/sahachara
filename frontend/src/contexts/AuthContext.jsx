import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Initialize Axios common header synchronously to avoid race conditions during mounting
const initialToken = localStorage.getItem("token");
if (initialToken) {
    axios.defaults.headers.common["X-Auth-Token"] = initialToken;
}

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(initialToken);

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common["X-Auth-Token"] = token;
            // Decode mock token to determine user
            if (token.startsWith("admin")) {
                setUser({ username: "admin", role: "ADMIN" });
            } else {
                setUser({ username: "student", role: "USER" });
            }
        } else {
            delete axios.defaults.headers.common["X-Auth-Token"];
            setUser(null);
        }
    }, [token]);

    const login = async (username) => {
        try {
            const res = await axios.post("http://localhost:4000/auth/login", { username });
            setToken(res.data.token);
            localStorage.setItem("token", res.data.token);
            setUser(res.data.user);
        } catch (e) {
            console.error(e);
            alert("Login failed");
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("token");
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
