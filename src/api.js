
import axios from "axios";

// 获取API URL，如果环境变量不存在，则使用本地后端
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
console.log("Using API URL:", API_URL);

// 创建axios实例
const instance = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 增加到60秒
  withCredentials: false
});

instance.interceptors.request.use(
  (config) => {
    console.log(`Sending request to: ${config.baseURL}${config.url}`, {
      method: config.method,
      headers: config.headers,
      data: config.data
    });
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

instance.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url}:`, {
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`API Error (${error.response.status}):`, {
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error("No response received:", {
        request: error.request,
        config: error.config
      });
      // 自定义超时错误消息
      if (error.code === 'ECONNABORTED') {
        error.message = '服务器响应超时，请稍后再试';
      }
    } else {
      console.error("Request setup error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default instance;









