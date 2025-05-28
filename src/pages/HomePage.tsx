import React from 'react';
import { Box, Button, Typography, Card, CardContent } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../authContext';
import '../styles/HomePage.css'; 

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePlayClick = () => {
    if (user) {
      navigate('/PlayerSetup'); // Corrected route path
    } else {
      navigate('/login');
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
      <Typography variant="h2" gutterBottom sx={{ fontFamily: '"Press Start 2P", cursive', color: 'white', textShadow: '2px 2px 4px #000' }}>
        Kalah Game
      </Typography>
      
      <Card sx={{ maxWidth: 800, width: '100%', mb: 4, borderRadius: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ fontFamily: '"Press Start 2P", cursive' }}>
            How to Play
          </Typography>
          <Typography variant="body1" paragraph>
            Kalah is an ancient board game from the Mancala family. The game is played on a board with 14 pits - 6 small pits on each side and 2 larger pits (called Kalah or stores) at each end.
          </Typography>
          <Typography variant="body1" paragraph>
            At the start of the game, each of the 12 small pits contains 4 stones. The objective is to capture more stones than your opponent.
          </Typography>
          <Typography variant="body1">
            The game ends when one of the players runs out of stones in their pits or has no more possibility to draw stones. The player with the most stones in their bucket wins the game.
          </Typography>
        </CardContent>
      </Card>
      <Box sx={{ mt: 3 }}>
        <Button 
          variant="contained" 
          color="success" 
          sx={{ px: 5, py: 1 }}
          onClick={handlePlayClick}
        >
          {user ? 'Play' : 'Login to Play'}
        </Button>
        {user && (
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ px: 5, py: 1, ml: 2 }}
            onClick={() => navigate('/profile')}
          >
            My Profile
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default HomePage;
