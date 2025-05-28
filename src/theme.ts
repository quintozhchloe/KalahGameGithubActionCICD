'use client';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: '"Press Start 2P", cursive',
  },
  palette: {
    primary: {
      main: '#00ff00',
    },
    secondary: {
      main: '#0000ff',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: '"Press Start 2P", cursive',
          textTransform: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            fontFamily: 'Roboto, sans-serif',
          },
        },
      },
    },
  },
});

export default theme;
