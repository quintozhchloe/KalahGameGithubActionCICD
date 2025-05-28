import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Button, Avatar, Card, CardContent, Grid, TextField, CircularProgress, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../authContext';
import axios from '../api';
import SafeAvatar from '../components/SafeAvatar';
import { getFullImageUrl } from '../utils/imageUtils';
import { gameSocket } from '../services/socket';

const apiBaseUrl = process.env.REACT_APP_API_URL || '';

interface MatchmakingUIProps {
  status: 'idle' | 'searching' | 'matched';
  countdown: number;
  handleFindMatch: () => void;
}

const MatchmakingUI: React.FC<MatchmakingUIProps> = ({ status, countdown, handleFindMatch }) => {
  return (
    <Box sx={{ mt: 3, textAlign: 'center' }}>
      {status === 'idle' && (
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleFindMatch}
          sx={{ px: 4, py: 1.5, fontSize: '1.2rem', fontFamily: '"Press Start 2P", cursive' }}
        >
          Find Match
        </Button>
      )}
      
      {status === 'searching' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" sx={{ fontFamily: '"Press Start 2P", cursive' }}>
            Searching for opponent...
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, fontFamily: '"Press Start 2P", cursive' }}>
            {countdown > 0 ? `Timeout in ${countdown}s` : 'Still searching...'}
          </Typography>
        </Box>
      )}
      
      {status === 'matched' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontFamily: '"Press Start 2P", cursive', color: 'green' }}>
            Match found!
          </Typography>
          <CircularProgress size={40} sx={{ mt: 2 }} />
          <Typography variant="body1" sx={{ mt: 1, fontFamily: '"Press Start 2P", cursive' }}>
            Preparing game...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const PlayerSetup: React.FC = () => {
  const { user, fetchUser } = useAuth();
  const [avatar, setAvatar] = useState<string>(user?.avatar || '/assets/1.png');
  const [status, setStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [countdown, setCountdown] = useState<number>(30);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);
  const navigate = useNavigate();

  // 当用户对象更新时，更新头像状态
  useEffect(() => {
    if (user && user.avatar) {
      setAvatar(user.avatar);
    }
  }, [user]);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (status === 'searching' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status, countdown]);

  useEffect(() => {
    if (countdown === 0) {
      if (socket) {
        socket.close();
      }
      
      // 提示用户是否要与AI对战
      const playWithAI = window.confirm('No opponent found. Would you like to play against AI?');
      
      if (playWithAI) {
        // 设置AI对手信息
        sessionStorage.setItem('playerRole', 'player1');
        sessionStorage.setItem('player1Name', user?.username || 'Player');
        sessionStorage.setItem('player2Name', 'AI Opponent');
        sessionStorage.setItem('player1Avatar', avatar);
        sessionStorage.setItem('player2Avatar', '/assets/robot.png'); // AI头像
        sessionStorage.setItem('isAIPlayer', 'true');
        
        // 导航到游戏页面
        navigate('/game');
      } else {
        setStatus('idle');
        setCountdown(30);
      }
    }
  }, [countdown, socket, navigate, user, avatar]);

  const handleFindMatch = () => {
    setStatus('searching');
    
    // 关闭之前的连接（如果存在）
    if (socket) {
      socket.close();
    }
    
    console.log('Connecting to matchmaking server...');
    const ws = new WebSocket('ws://localhost:8080');
    setSocket(ws);

    ws.onopen = () => {
      console.log('Connected to matchmaking server');
      // Send player info to server
      const playerData = {
        type: 'FIND_MATCH',
        player: {
          name: user?.username || 'Player',
          avatar: avatar,
          id: user?.id || Date.now().toString() // 添加唯一ID
        }
      };
      console.log('Sending player data:', playerData);
      ws.send(JSON.stringify(playerData));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received message from server:', data);

        if (data.type === 'connected') {
          console.log('Connection confirmed with ID:', data.id);
        }

        if (data.type === 'WAITING') {
          console.log('Waiting for another player...');
          // 可以添加UI提示
        }

        if (data.type === 'MATCH_FOUND') {
          console.log('Match found! You are:', data.role);
          console.log('Opponent:', data.opponent);
          console.log('Game ID:', data.gameId); // 添加日志
          
          setStatus('matched');
          
          // 存储游戏ID
          sessionStorage.setItem('gameId', data.gameId);
          
          // Store opponent info
          sessionStorage.setItem('playerRole', data.role);
          sessionStorage.setItem('player1Name', data.role === 'player1' ? user?.username || 'Player' : data.opponent.name);
          sessionStorage.setItem('player2Name', data.role === 'player2' ? user?.username || 'Player' : data.opponent.name);
          sessionStorage.setItem('player1Avatar', data.role === 'player1' ? avatar : data.opponent.avatar);
          sessionStorage.setItem('player2Avatar', data.role === 'player2' ? avatar : data.opponent.avatar);
          sessionStorage.setItem('isAIPlayer', 'false'); // 确保设置为人类对手
          
          // Navigate to game after a short delay
          setTimeout(() => {
            console.log('Navigating to game page...');
            navigate('/game');
          }, 1500);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('Disconnected from server:', event.code, event.reason);
      // 如果不是正常关闭，可能需要重新连接或显示错误
      if (event.code !== 1000) {
        setStatus('idle');
        setCountdown(30);
        alert('Connection to matchmaking server lost. Please try again.');
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setStatus('idle');
      setCountdown(30);
      alert('Error connecting to matchmaking server. Please try again later.');
    };
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit');
      setOpenSnackbar(true);
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are allowed');
      setOpenSnackbar(true);
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      // Upload avatar to server
      const response = await axios.post(`${apiBaseUrl}/users/upload-avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('Avatar upload response:', response.data);

      // Update avatar state with the URL returned from server
      const fullAvatarUrl = getFullImageUrl(response.data.avatar_url);
      console.log('Setting new avatar URL:', fullAvatarUrl);
      
      setAvatar(fullAvatarUrl);
      
      // Update user context
      if (user) {
        user.avatar = fullAvatarUrl;
      }
      
      // 刷新用户信息以确保头像更新
      if (fetchUser) {
        await fetchUser();
      }
      
      // 显示成功消息
      setSuccessMessage('Avatar uploaded successfully!');
      setOpenSnackbar(true);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setUploadError('Failed to upload avatar. Please try again.');
      setOpenSnackbar(true);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  if (!user) return null;

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
      <Typography variant="h3" gutterBottom sx={{ fontFamily: '"Press Start 2P", cursive', color: 'white', textShadow: '2px 2px 4px #000' }}>
        Player Profile
      </Typography>
      
      <Card sx={{ maxWidth: 600, width: '100%', p: 3, borderRadius: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ position: 'relative' }}>
                <SafeAvatar 
                  src={avatar} 
                  fallbackSrc="/assets/1.png"
                  sx={{ 
                    width: 180, 
                    height: 180, 
                    border: '4px solid #3f51b5',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.05)'
                    }
                  }}
                  onClick={handleAvatarClick}
                />
                {isUploading && (
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    borderRadius: '50%'
                  }}>
                    <CircularProgress />
                  </Box>
                )}
              </Box>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
              />
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                Click to upload avatar (max 5MB)
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" gutterBottom sx={{ fontFamily: '"Press Start 2P", cursive' }}>
                {user.username || 'Player'}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Ready to play Kalah? Find a match and start playing!
              </Typography>
              <MatchmakingUI 
                status={status} 
                countdown={countdown} 
                handleFindMatch={handleFindMatch} 
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* 成功或错误提示 */}
      <Snackbar 
        open={openSnackbar} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={uploadError ? "error" : "success"} 
          sx={{ width: '100%' }}
        >
          {uploadError || successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PlayerSetup;
