import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, Tabs, Tab, TextField, Button, Typography, CircularProgress, Alert, Card, CardContent } from "@mui/material";
import { useAuth } from "../authContext";

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { login, register, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    
    if (!username || !password) {
      setErrorMessage("Username and password are required");
      return;
    }

    try {
      if (mode === "login") {
        console.log("Attempting to login with username:", username);
        await login(username, password);
        navigate("/PlayerSetup");
      } else {
        console.log("Attempting to register with username:", username);
        await register(username, password);
        navigate("/PlayerSetup");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      
      // 提供更详细的错误信息
      if (err.message === "Network Error") {
        setErrorMessage(
          "无法连接到服务器。请确保后端服务器正在运行，并且API URL配置正确。" +
          "当前API URL: " + (process.env.REACT_APP_API_URL || "http://localhost:8000")
        );
      } else if (err.code === 'ECONNABORTED') {
        setErrorMessage("服务器响应超时，请稍后再试");
      } else {
        setErrorMessage(
          err.response?.data?.detail || 
          error || 
          "连接错误。请检查服务器是否正在运行。"
        );
      }
    }
  };

  // 添加测试函数
  const testBackendConnection = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";
      console.log("Testing connection to:", apiUrl);
      const response = await fetch(`${apiUrl}/`);
      const data = await response.json();
      console.log("Connection test successful:", data);
      setErrorMessage(`连接测试成功: ${JSON.stringify(data)}`);
    } catch (err: unknown) {
      console.error("Connection test failed:", err);
      
      // 更安全的错误处理
      let errorMessage = '未知错误';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String(err.message);
      }
      
      setErrorMessage(`连接测试失败: ${errorMessage}`);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      p: 3, 
      background: 'linear-gradient(to bottom right, #00ff00, #0000ff)' 
    }}>
      <Typography variant="h3" gutterBottom sx={{ 
        fontFamily: '"Press Start 2P", cursive', 
        color: 'white', 
        textShadow: '2px 2px 4px #000' 
      }}>
        {mode === "login" ? "Welcome Back!" : "Create Account"}
      </Typography>

      <Card elevation={6} sx={{ 
        maxWidth: 450, 
        width: '100%', 
        borderRadius: 2, 
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
      }}>
        <CardContent sx={{ p: 4 }}>
          <Tabs 
            value={mode} 
            onChange={(e, val) => setMode(val)} 
            centered
            sx={{ 
              mb: 3,
              '& .MuiTab-root': {
                fontFamily: '"Press Start 2P", cursive',
                fontSize: '0.9rem'
              }
            }}
          >
            <Tab label="Login" value="login" />
            <Tab label="Register" value="register" />
          </Tabs>

          {(errorMessage || error) && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {errorMessage || error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
              sx={{ 
                mb: 2,
                '& .MuiInputLabel-root': {
                  fontFamily: '"Press Start 2P", cursive',
                  fontSize: '0.8rem'
                }
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              sx={{ 
                mb: 3,
                '& .MuiInputLabel-root': {
                  fontFamily: '"Press Start 2P", cursive',
                  fontSize: '0.8rem'
                }
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ 
                mt: 2, 
                py: 1.5, 
                fontFamily: '"Press Start 2P", cursive',
                fontSize: '1rem',
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)'
              }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                mode === "login" ? "Login" : "Register"
              )}
            </Button>
          </form>
          <Button
            variant="outlined"
            color="secondary"
            onClick={testBackendConnection}
            sx={{ mt: 2 }}
          >
            Test Backend Connection
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AuthPage;
