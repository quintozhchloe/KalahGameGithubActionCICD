import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { getAssetPath, checkAssetExists } from '../utils/assetUtils';
import { GameState } from '../types';

interface BoardProps {
  gameState: GameState;
  onPitClick: (pitIndex: number) => void;
}

const Board: React.FC<BoardProps> = ({ gameState, onPitClick }) => {
  const [woodenBgLoaded, setWoodenBgLoaded] = useState(false);
  
  useEffect(() => {
    // 检查木质背景图片是否存在
    checkAssetExists('wooden.png').then(exists => {
      setWoodenBgLoaded(exists);
    });
  }, []);

  const renderPits = (start: number, end: number) => {
    return gameState.pits.slice(start, end).map((seeds: number, index: number) => (
      <Box 
        key={index} 
        className="pit" 
        onClick={() => onPitClick(start + index)}
        sx={{
          backgroundColor: 'rgba(192, 192, 192, 1)', 
          boxShadow: 'inset 0 0 10px #000000',
          borderRadius: '50%',
          padding: '10px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          width: { xs: '60px', sm: '72px', md: '86.4px' },
          height: { xs: '60px', sm: '72px', md: '86.4px' }, 
          margin: '10px'
        }}
      >
        <Typography 
          className="seeds"
          sx={{
            fontSize: { xs: '16px', sm: '20px', md: '24px' },
            fontWeight: 'bold',
            color: 'black'
          }}
        >
          {seeds}
        </Typography>
      </Box>
    ));
  };

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography 
        variant="h6" 
        sx={{ 
          mb: 2, 
          fontFamily: '"Press Start 2P", cursive', 
          fontSize: { xs: '0.8rem', sm: '1rem', md: '1.2rem' } 
        }}
      >
        {gameState.currentPlayer === 0 ? "Player 1's turn" : "Player 2's turn"}
      </Typography>
      <Grid 
        container 
        justifyContent="center" 
        alignItems="center" 
        sx={{ 
          backgroundColor: woodenBgLoaded ? 'transparent' : '#8B4513', // 备用背景色
          height: '100%',
          backgroundImage: woodenBgLoaded 
            ? `url(${getAssetPath('wooden.png')})` 
            : 'none',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          borderRadius: '10px',
          padding: '10px'
        }}
      >
        <Grid item xs={1}>
          <Box 
            className="store" 
            sx={{
              backgroundColor: 'rgba(192, 192, 192, 1)', 
              boxShadow: 'inset 0 0 10px #000000',
              borderRadius: '15px',
              padding: '10px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: { xs: '60px', sm: '72px', md: '86.4px' },
              height: { xs: '180px', sm: '200px', md: '216px' }, 
              margin: '10px'
            }}
          >
            <Typography 
              className="seeds"
              sx={{
                fontSize: { xs: '18px', sm: '22px', md: '24px' },
                fontWeight: 'bold',
                color: 'black'
              }}
            >
              {gameState.pits[13]}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={10}>
          <Grid container justifyContent="space-between">
            <Grid item xs={12} className="pits" sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              {renderPits(7, 13).reverse()}
            </Grid>
            <Grid item xs={12} className="pits" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              {renderPits(0, 6)}
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={1}>
          <Box 
            className="store" 
            sx={{
              backgroundColor: 'rgba(192, 192, 192, 1)', 
              boxShadow: 'inset 0 0 10px #000000',
              borderRadius: '15px',
              padding: '10px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: { xs: '60px', sm: '72px', md: '86.4px' }, 
              height: { xs: '180px', sm: '200px', md: '216px' }, 
              margin: '10px'
            }}
          >
            <Typography 
              className="seeds"
              sx={{
                fontSize: { xs: '18px', sm: '22px', md: '24px' },
                fontWeight: 'bold',
                color: 'black'
              }}
            >
              {gameState.pits[6]}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Board;
