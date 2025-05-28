import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Box, Avatar, Divider, CircularProgress, Button } from '@mui/material';
import axios from 'axios';
import { RefreshRounded } from '@mui/icons-material';

// 定义排行榜条目类型
interface LeaderboardEntry {
  id?: string;
  playerName: string;
  score: number;
  duration: number;
  avatar: string;
}

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching leaderboard from:', `${API_URL}/leaderboard`);
      const response = await axios.get(`${API_URL}/leaderboard`);
      console.log('Fetched leaderboard data:', response.data);
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError('Failed to load leaderboard. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);
  
  useEffect(() => {
    fetchLeaderboard();
    
    // 每60秒自动刷新一次
    const intervalId = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(intervalId);
  }, [fetchLeaderboard]);
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <Card sx={{ mt: 3, p: 2, maxWidth: 1100, mx: 'auto', border: '2px solid white' }}>
      <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
        <Typography variant="h5" gutterBottom sx={{ fontFamily: '"Press Start 2P", cursive', mr: 1 }}>
          👑
        </Typography>
        <Typography variant="h5" gutterBottom sx={{ fontFamily: '"Press Start 2P", cursive' }}>
          Leaderboard
        </Typography>
        <Typography variant="h5" gutterBottom sx={{ fontFamily: '"Press Start 2P", cursive', ml: 1 }}>
          👑
        </Typography>
        <Button 
          size="small" 
          sx={{ ml: 2 }} 
          onClick={fetchLeaderboard}
          disabled={loading}
        >
          <RefreshRounded />
        </Button>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" textAlign="center">
          {error}
        </Typography>
      ) : (
        <Box component="ul" sx={{ p: 0, listStyle: 'none' }}>
          {leaderboard.length === 0 ? (
            <Typography textAlign="center" sx={{ fontFamily: '"Press Start 2P", cursive', fontSize: '0.8rem' }}>
              No scores yet. Be the first to play!
            </Typography>
          ) : (
            leaderboard.slice(0, 5).map((player, index) => (
              <Box key={index} textAlign="center">
                <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
                  <Typography component="span" sx={{ fontFamily: '"Press Start 2P", cursive', fontSize: '1.2rem' }}>
                    {index + 1}.
                  </Typography>
                  <Avatar src={player.avatar} sx={{ width: 40, height: 40 }} />
                  <Typography component="li" sx={{ fontFamily: '"Press Start 2P", cursive', mb: 1, fontSize: '0.8rem' }}>
                    {player.playerName}: {player.score} points ({formatTime(player.duration)})
                  </Typography>
                </Box>
                {index < leaderboard.length - 1 && <Divider sx={{ my: 1 }} />}
              </Box>
            ))
          )}
        </Box>
      )}
    </Card>
  );
};

export default Leaderboard;
