import React from 'react';
import { 
  Button,
  Box,
  Typography,
  CircularProgress,
  Paper
} from '@mui/material';

interface MatchmakingUIProps {
  status: 'idle' | 'searching' | 'matched' | 'ai'; // 明确枚举值
  countdown: number;
  handleFindMatch: () => void;
}
const MatchmakingUI = ({ status, countdown, handleFindMatch }: MatchmakingUIProps) => {
  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      p: 3,
      maxWidth: 400,
      mx: 'auto'
    }}>
      {status === 'idle' && (
        <Button 
          variant="contained" 
          color="primary"
          size="large"
          onClick={handleFindMatch}
          sx={{ width: 200 }}
        >
          Find Match
        </Button>
      )}
      
      {status === 'searching' && (
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', width: '100%' }}>
          <CircularProgress color="secondary" sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Searching for opponent...
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {countdown}s remaining
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Will play against AI if no match found
          </Typography>
        </Paper>
      )}
      
      {status === 'matched' && (
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="success.main">
            🎉 Match found!
          </Typography>
          <Typography variant="body1">
            Starting game...
          </Typography>
        </Paper>
      )}
      
      {status === 'ai' && (
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="info.main">
            🤖 Playing against AI
          </Typography>
          <Typography variant="body1">
            Preparing AI opponent...
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default MatchmakingUI;