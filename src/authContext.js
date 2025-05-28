
import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "./api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      console.log("Attempting login for user:", username);
      const params = new URLSearchParams();
      params.append("username", username);
      params.append("password", password);
      
      console.log("Sending login request to:", "/auth/token");
      const res = await axios.post("/auth/token", params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      console.log("Login response:", res.data);
      
      localStorage.setItem("token", res.data.access_token);
      await fetchUser();
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.detail || 
        err.message || 
        "Failed to login. Please check your connection and try again."
      );
      setLoading(false);
      throw err;
    }
  };

  const register = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      console.log("Attempting registration for user:", username);
      const res = await axios.post("/auth/register", { 
        username, 
        password, 
        email: `${username}@example.com` 
      });
      console.log("Registration response:", res.data);
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        err.response?.data?.detail || 
        err.message || 
        "Failed to register. Please check your connection and try again."
      );
      setLoading(false);
      throw err;
    }
  };

  const fetchUser = async () => {
    try {
      console.log("Fetching user data");
      const res = await axios.get("/users/me");
      console.log("User data:", res.data);
      
      // 确保头像URL是完整的
      if (res.data && res.data.avatar && !res.data.avatar.startsWith('http')) {
        const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
        res.data.avatar = `${apiBaseUrl}${res.data.avatar}`;
      }
      
      setUser(res.data);
      return res.data;
    } catch (err) {
      console.error("Error fetching user:", err);
      logout();
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  useEffect(() => {
    if (localStorage.getItem("token")) {
      fetchUser();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      register, 
      fetchUser, 
      loading, 
      error 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}





