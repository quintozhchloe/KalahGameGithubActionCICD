import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Avatar, Card, CardContent, Grid, TextField, CircularProgress, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../authContext';
import axios from '../api';

const ProfilePage: React.FC = () => {
  const { user, logout, fetchUser } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error'>('success');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    setUsername(user.username || '');
    setEmail(user.email || '');
  }, [user, navigate]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await axios.put('/users/update-profile', {
        username,
        email
      });
      
      setSeverity('success');
      setMessage('Profile updated successfully');
      setOpenSnackbar(true);
      setIsEditing(false);
      
      // Refresh user data
      await fetchUser();
    } catch (error) {
      console.error('Error updating profile:', error);
      setSeverity('error');
      setMessage('Failed to update profile');
      setOpenSnackbar(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
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
        User Profile
      </Typography>
      
      <Card sx={{ maxWidth: 600, width: '100%', p: 3, borderRadius: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Avatar 
                src={user.avatar} 
                sx={{ 
                  width: 120, 
                  height: 120, 
                  border: '4px solid #3f51b5',
                  mb: 2
                }}
              />
              <Button 
                variant="outlined" 
                color="primary"
                onClick={() => navigate('/PlayerSetup')}
                sx={{ mb: 1, width: '100%' }}
              >
                Change Avatar
              </Button>
            </Grid>
            <Grid item xs={12} md={8}>
              {isEditing ? (
                <>
                  <TextField
                    fullWidth
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    margin="normal"
                    disabled={isLoading}
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    margin="normal"
                    disabled={isLoading}
                  />
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button 
                      variant="outlined" 
                      onClick={() => setIsEditing(false)}
                      sx={{ mr: 1 }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="contained" 
                      color="primary"
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                    >
                      {isLoading ? <CircularProgress size={24} /> : 'Save'}
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  <Typography variant="h5" gutterBottom sx={{ fontFamily: '"Press Start 2P", cursive' }}>
                    {user.username}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    Email: {user.email || 'Not set'}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                    Member since: {new Date(user.created_at || Date.now()).toLocaleDateString()}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Button 
                      variant="outlined" 
                      color="primary"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit Profile
                    </Button>
                    <Button 
                      variant="contained" 
                      color="primary"
                      onClick={() => navigate('/PlayerSetup')}
                    >
                      Play Game
                    </Button>
                  </Box>
                </>
              )}
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="outlined" 
              color="secondary"
              onClick={handleLogout}
            >
              Logout
            </Button>
            <Button 
              variant="outlined"
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          </Box>
        </CardContent>
      </Card>
      
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={severity} sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfilePage;

