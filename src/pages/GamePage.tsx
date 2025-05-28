import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Button, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardHeader, Avatar } from '@mui/material';
import { Celebration } from '@mui/icons-material';
import Board from '../components/Board';
import Leaderboard from '../components/Leaderboard';
import { GameState, OpponentMoveMessage } from '../types';
import axios from 'axios';
import SafeAvatar from '../components/SafeAvatar';
import { getAssetPath, checkAssetExists } from '../utils/assetUtils';
import SimpleConfetti from '../components/SimpleConfetti';
// 确保导入路径正确
import { gameSocket } from '../services/socket';

const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const getInitialGameState = (): GameState => {
  const startingSeeds = parseInt(sessionStorage.getItem('startingSeeds') || '4', 10);
  return {
    pits: Array(14).fill(startingSeeds).map((v, i) => (i === 6 || i === 13 ? 0 : startingSeeds)),
    currentPlayer: 0,
    players: [
      { name: sessionStorage.getItem('player1Name') || 'Player 1', score: 0, avatar: sessionStorage.getItem('player1Avatar') || '/assets/1.png' },
      { name: sessionStorage.getItem('player2Name') || 'Player 2', score: 0, avatar: sessionStorage.getItem('player2Avatar') || '/assets/2.png' },
    ],
  };
};

const GamePage: React.FC<{ password?: string }> = ({ password }) => {
  const [gameState, setGameState] = useState<GameState>(getInitialGameState());
  const [notification, setNotification] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);
  const isAIPlayer = JSON.parse(sessionStorage.getItem('isAIPlayer') || 'false');
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [bgImageLoaded, setBgImageLoaded] = useState(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [isMyTurn, setIsMyTurn] = useState<boolean>(true); // 是否是我的回合
  const gameId = useRef<string>(sessionStorage.getItem('gameId') || '');
  const playerRole = sessionStorage.getItem('playerRole') || 'player1';
  const myPlayerIndex = playerRole === 'player1' ? 0 : 1;
  const [socketStatus, setSocketStatus] = useState<string>('unknown');
  // 临时解决方案：直接在组件中创建 WebSocket
  const [directSocket, setDirectSocket] = useState<WebSocket | null>(null);

  // 在组件内部创建 WebSocket
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [socketCallbacks, setSocketCallbacks] = useState<Record<string, Array<(data: any) => void>>>({
    OPPONENT_MOVE: []
  });

  // 创建 WebSocket 连接
  useEffect(() => {
    console.log('初始化 WebSocket 连接...');
    
    // 关闭任何现有连接
    if (socket) {
      console.log('关闭现有 WebSocket 连接');
      socket.close();
    }
    
    // 创建新的 WebSocket 连接
    const ws = new WebSocket('ws://localhost:8080');
    
    // 暴露到 window 对象便于调试
    (window as any).gamePageSocket = ws;
    console.log('WebSocket 实例已暴露为 window.gamePageSocket');
    
    ws.onopen = () => {
      console.log('WebSocket 连接已建立');
      setSocket(ws);
      setSocketStatus('connected');
      
      // 连接后立即加入游戏
      if (gameId.current) {
        const joinMessage = {
          type: 'JOIN_GAME',
          gameId: gameId.current,
          playerRole: playerRole,
          playerIndex: myPlayerIndex
        };
        console.log('发送加入游戏请求:', joinMessage);
        ws.send(JSON.stringify(joinMessage));
        
        // 立即请求同步游戏状态
        setTimeout(() => {
          const syncMessage = {
            type: 'SYNC_GAME',
            gameId: gameId.current,
            playerRole: playerRole
          };
          console.log('发送初始同步请求:', syncMessage);
          ws.send(JSON.stringify(syncMessage));
        }, 500); // 延迟 500ms 确保加入游戏请求先处理
      }
    };
    
    ws.onmessage = (event) => {
      try {
        console.log('收到消息:', event.data);
        const data = JSON.parse(event.data);
        
        // 处理游戏状态更新
        if (data.type === 'GAME_STATE' && data.gameState) {
          console.log('收到游戏状态更新:', data.gameState);
          setGameState(data.gameState);
          setIsMyTurn(data.gameState.currentPlayer === myPlayerIndex);
          setNotification(data.gameState.currentPlayer === myPlayerIndex ? "你的回合" : "等待对手");
        }
        
        // 处理对手移动
        else if (data.type === 'OPPONENT_MOVE' && data.gameState) {
          console.log('收到对手移动:', data);
          setGameState(data.gameState);
          setIsMyTurn(true);
          setNotification("你的回合");
        }
        
        // 处理游戏结束
        else if (data.type === 'GAME_OVER' && data.gameState) {
          console.log('收到游戏结束:', data);
          setGameState(data.gameState);
          setGameOver(true);
          setWinner(data.winner || "游戏结束");
          setShowConfetti(true);
        }
      } catch (error) {
        console.error('处理消息时出错:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket 连接已关闭');
      setSocket(null);
      setSocketStatus('closed');
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
      setSocketStatus('error');
    };
    
    // 清理函数
    return () => {
      console.log('清理 WebSocket 连接');
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, []); // 空依赖数组，确保只运行一次

  // 添加游戏ID和玩家角色变更监听
  useEffect(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !gameId.current) return;
    
    console.log('游戏ID或玩家角色已更新，重新加入游戏');
    const joinMessage = {
      type: 'JOIN_GAME',
      gameId: gameId.current,
      playerRole: playerRole,
      playerIndex: myPlayerIndex
    };
    socket.send(JSON.stringify(joinMessage));
    
    // 请求同步
    setTimeout(() => {
      const syncMessage = {
        type: 'SYNC_GAME',
        gameId: gameId.current,
        playerRole: playerRole
      };
      socket.send(JSON.stringify(syncMessage));
    }, 500);
  }, [gameId.current, playerRole, myPlayerIndex, socket]);

  // 添加回调
  useEffect(() => {
    if (!socket) return;
    
    // 添加对手移动回调
    const opponentMoveCallback = (data: any) => {
      console.log('OPPONENT_MOVE callback triggered with data:', data);
      if (data && data.gameState) {
        console.log('Valid gameState received, updating local state');
        setGameState(data.gameState);
        setIsMyTurn(true);
        setNotification("Your turn");
      } else {
        console.error('Invalid data received from opponent move:', data);
      }
    };
    
    setSocketCallbacks(prev => ({
      ...prev,
      OPPONENT_MOVE: [...prev.OPPONENT_MOVE, opponentMoveCallback]
    }));
    
    // 清理函数
    return () => {
      setSocketCallbacks(prev => ({
        ...prev,
        OPPONENT_MOVE: prev.OPPONENT_MOVE.filter(cb => cb !== opponentMoveCallback)
      }));
    };
  }, [socket]);

  // 简化发送移动的函数
  const sendMove = useCallback((move: number, newGameState: GameState) => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !gameId.current) {
      console.error('无法发送移动：WebSocket 未连接或游戏ID不存在');
      return false;
    }
    
    const message = {
      type: 'GAME_MOVE',
      gameId: gameId.current,
      move: move,
      gameState: newGameState
    };
    
    console.log('发送移动:', message);
    socket.send(JSON.stringify(message));
    return true;
  }, [socket, gameId]);

  useEffect(() => {
    // 添加玩家角色和索引的日志
    console.log('Player Role:', playerRole);
    console.log('My Player Index:', myPlayerIndex);
    console.log('Initial Turn Status:', isMyTurn);
    
    // 检查 socket 连接
    if (socket) {
      console.log('Socket connection status:', socket.readyState);
    } else {
      console.log('Socket not initialized yet');
    }
  }, [playerRole, myPlayerIndex, isMyTurn, socket]);

  useEffect(() => {
    // 检查 gameSocket 是否存在
    if (!gameSocket) {
      console.error('gameSocket is undefined! Trying to reinitialize...');
      // 尝试重新导入
      import('../services/socket').then(module => {
        console.log('Reimported gameSocket:', module.gameSocket);
        // 可以在这里添加额外的初始化逻辑
      }).catch(error => {
        console.error('Failed to reimport gameSocket:', error);
      });
      return;
    }
    
    console.log('gameSocket exists:', gameSocket);
    
    // 为调试目的暴露到 window
    if (typeof window !== 'undefined') {
      (window as any).gameSocket = gameSocket;
      console.log('Exposed gameSocket to window for debugging');
    }
    
    // 检查背景图片是否存在
    checkAssetExists('bg.png').then(exists => {
      setBgImageLoaded(exists);
    });
    
    // 设置初始回合
    setIsMyTurn(gameState.currentPlayer === myPlayerIndex);
    
    // 获取游戏ID
    const storedGameId = sessionStorage.getItem('gameId');
    if (storedGameId) {
      gameId.current = storedGameId;
      console.log('Game ID retrieved from session storage:', gameId.current);
    }
    
    // 移除之前的监听器，避免重复
    if (gameSocket && typeof gameSocket.callbacks === 'object' && gameSocket.callbacks) {
      console.log('Clearing previous OPPONENT_MOVE callbacks');
      gameSocket.callbacks['OPPONENT_MOVE'] = [];
    }
    
    // 监听对手移动
    console.log('Registering new OPPONENT_MOVE callback');
    gameSocket.on('OPPONENT_MOVE', (data: any) => {
      console.log('OPPONENT_MOVE callback triggered with data:', data);
      if (data && data.gameState) {
        console.log('Valid gameState received, updating local state');
        setGameState(data.gameState);
        setIsMyTurn(true);
        setNotification("Your turn");
      } else {
        console.error('Invalid data received from opponent move:', data);
      }
    });
    
    // 检查回调是否注册成功
    if (gameSocket && gameSocket.callbacks && gameSocket.callbacks['OPPONENT_MOVE']) {
      console.log(`OPPONENT_MOVE callbacks count: ${gameSocket.callbacks['OPPONENT_MOVE'].length}`);
    }
    
    // 如果不是AI对战，确保游戏ID存在
    if (!isAIPlayer && !gameId.current) {
      console.error('No game ID found for multiplayer game');
      setNotification('Error: No game ID found');
    } else if (!isAIPlayer) {
      console.log('Multiplayer game with ID:', gameId.current);
    }
    
    // 清理函数
    return () => {
      console.log('Cleaning up OPPONENT_MOVE callbacks');
      if (gameSocket && typeof gameSocket.callbacks === 'object' && gameSocket.callbacks) {
        gameSocket.callbacks['OPPONENT_MOVE'] = [];
      }
    };
  }, [myPlayerIndex]);

  useEffect(() => {
    // 如果 gameSocket 不可用，创建直接连接
    if (!gameSocket) {
      console.log('Creating direct WebSocket connection');
      const ws = new WebSocket('ws://localhost:8080');
      
      ws.onopen = () => {
        console.log('Direct WebSocket connection established');
        setDirectSocket(ws);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Direct socket received message:', data);
          
          if (data.type === 'OPPONENT_MOVE') {
            console.log('Received opponent move:', data);
            if (data.gameState) {
              setGameState(data.gameState);
              setIsMyTurn(true);
              setNotification("Your turn");
            }
          }
        } catch (error) {
          console.error('Error processing direct socket message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('Direct WebSocket connection closed');
        setDirectSocket(null);
      };
      
      return () => {
        ws.close();
      };
    }
  }, []);

  const isGameOver = useCallback((gameState: GameState) => {
    const player1Empty = gameState.pits.slice(0, 6).every(pit => pit === 0);
    const player2Empty = gameState.pits.slice(7, 13).every(pit => pit === 0);
    return player1Empty || player2Empty;
  }, []);

  const isMoveValid = useCallback((pitIndex: number) => {
    return (gameState.currentPlayer === 0 && pitIndex < 6 && gameState.pits[pitIndex] > 0) ||
           (gameState.currentPlayer === 1 && pitIndex > 6 && pitIndex < 13 && gameState.pits[pitIndex] > 0);
  }, [gameState]);

  const updateLeaderboard = useCallback(async (name: string, score: number, duration: number, avatar: string) => {
    const newEntry = { playerName: name, score, duration, avatar };
    try {
      console.log('Updating leaderboard with:', newEntry);
      const response = await axios.post(`${apiBaseUrl}/leaderboard`, newEntry);
      console.log('Leaderboard updated successfully:', response.data);
      
      // 可选：触发排行榜组件刷新
      // 如果Leaderboard组件有刷新方法，可以在这里调用
      
      return true;
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      // 可以添加用户友好的错误提示
      setNotification('Failed to update leaderboard, but game completed!');
      return false;
    }
  }, [apiBaseUrl, setNotification]);

  // 添加 handleGameOver 函数 - 放在 handlePitClick 之前
  const handleGameOver = useCallback((finalGameState: GameState) => {
    console.log('Game over! Final state:', finalGameState);
    
    // 计算最终分数
    const player1Score = finalGameState.pits[6];
    const player2Score = finalGameState.pits[13];
    
    // 确定获胜者
    let winnerMessage;
    if (player1Score > player2Score) {
      winnerMessage = `${finalGameState.players[0].name} wins!`;
    } else if (player2Score > player1Score) {
      winnerMessage = `${finalGameState.players[1].name} wins!`;
    } else {
      winnerMessage = "It's a tie!";
    }
    
    // 更新状态
    setGameOver(true);
    setWinner(winnerMessage);
    setShowConfetti(true);
    
    // 计算游戏时长
    const gameDuration = Math.floor((Date.now() - startTime) / 1000);
    
    // 更新排行榜
    const winnerIndex = player1Score > player2Score ? 0 : player2Score > player1Score ? 1 : -1;
    if (winnerIndex >= 0) {
      const winnerName = finalGameState.players[winnerIndex].name;
      const winnerScore = winnerIndex === 0 ? player1Score : player2Score;
      const winnerAvatar = finalGameState.players[winnerIndex].avatar;
      
      // 只有当玩家获胜时才更新排行榜
      if ((winnerIndex === 0 && myPlayerIndex === 0) || (winnerIndex === 1 && myPlayerIndex === 1)) {
        updateLeaderboard(winnerName, winnerScore, gameDuration, winnerAvatar)
          .then(success => {
            if (success) {
              console.log('Leaderboard updated successfully');
            }
          });
      }
    }
    
    // 如果是多人游戏，通知对手游戏结束
    if (!isAIPlayer && socket && socket.readyState === WebSocket.OPEN && gameId.current) {
      socket.send(JSON.stringify({
        type: 'GAME_OVER',
        gameId: gameId.current,
        gameState: finalGameState,
        winner: winnerMessage
      }));
      console.log('Game over notification sent to opponent');
    }
  }, [setGameOver, setWinner, setShowConfetti, startTime, updateLeaderboard, isAIPlayer, socket, gameId, myPlayerIndex]);

  const handlePitClick = useCallback((pitIndex: number) => {
    // 如果不是我的回合且不是AI对战，则不允许移动
    if (!isAIPlayer && !isMyTurn) {
      setNotification("不是你的回合");
      return;
    }
    
    // 如果游戏已结束，不允许移动
    if (gameOver) {
      return;
    }
    
    // 检查移动是否有效 - 修复这里，只传入一个参数
    if (!isMoveValid(pitIndex)) {
      setNotification("无效的移动");
      return;
    }
    
    console.log('处理坑位点击:', pitIndex);
    
    // 创建游戏状态的深拷贝
    const newGameState = JSON.parse(JSON.stringify(gameState));
    
    // 获取当前坑中的种子数
    const seeds = newGameState.pits[pitIndex];
    newGameState.pits[pitIndex] = 0;
    
    // 分发种子
    let index = pitIndex;
    for (let i = 0; i < seeds; i++) {
      index = (index + 1) % 14;
      
      // 跳过对手的得分坑
      if ((gameState.currentPlayer === 0 && index === 13) || 
          (gameState.currentPlayer === 1 && index === 6)) {
        index = (index + 1) % 14;
      }
      
      newGameState.pits[index]++;
    }
    
    // 检查是否在自己的得分坑结束
    const extraTurn = (gameState.currentPlayer === 0 && index === 6) || 
                     (gameState.currentPlayer === 1 && index === 13);
    
    // 更新当前玩家
    const nextPlayer = extraTurn ? gameState.currentPlayer : (gameState.currentPlayer === 0 ? 1 : 0);
    newGameState.currentPlayer = nextPlayer;
    
    // 更新玩家分数
    newGameState.players[0].score = newGameState.pits[6];
    newGameState.players[1].score = newGameState.pits[13];
    
    // 先更新本地状态
    setGameState(newGameState);
    
    if (extraTurn) {
      setNotification(`${gameState.players[gameState.currentPlayer].name} gets an extra turn!`);
      setIsMyTurn(true);
    } else {
      // If not AI battle and it's opponent's turn
      if (!isAIPlayer) {
        if (nextPlayer !== myPlayerIndex) {
          setIsMyTurn(false);
          setNotification("Waiting for opponent's move");
          
          // Send move to server
          sendMove(pitIndex, newGameState);
        } else {
          setIsMyTurn(true);
          setNotification("Your turn");
        }
      }
    }

    // Check if game is over
    if (isGameOver(newGameState)) {
      console.log('Game over detected');
      handleGameOver(newGameState);
    }
  }, [gameState, isMyTurn, isAIPlayer, myPlayerIndex, gameOver, isMoveValid, sendMove, isGameOver, handleGameOver]);

  useEffect(() => {
    if (isAIPlayer && gameState.currentPlayer === 1 && !gameOver) {
      const validMoves = gameState.pits.slice(7, 13).map((seeds, index) => (seeds > 0 ? index + 7 : -1)).filter(index => index !== -1);
      if (validMoves.length > 0) {
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        setTimeout(() => handlePitClick(randomMove), 1000); //AI
      }
    }
  }, [gameState, isAIPlayer, gameOver, handlePitClick]);

  const restartGame = () => {
    setGameState(getInitialGameState());
    setNotification(null);
    setGameOver(false);
    setWinner(null);
    setStartTime(Date.now());
  };

  useEffect(() => {
    // 从sessionStorage获取玩家信息
    const player1Name = sessionStorage.getItem('player1Name') || 'Player 1';
    const player2Name = sessionStorage.getItem('player2Name') || 'Player 2';
    const player1Avatar = sessionStorage.getItem('player1Avatar') || '/assets/1.png';
    const player2Avatar = sessionStorage.getItem('player2Avatar') || '/assets/2.png';
    
    console.log('Player avatars:', {
      player1: player1Avatar,
      player2: player2Avatar
    });
    
    setGameState(prevState => ({
      ...prevState,
      players: [
        { ...prevState.players[0], name: player1Name, avatar: player1Avatar },
        { ...prevState.players[1], name: player2Name, avatar: player2Avatar }
      ]
    }));
  }, []);

  useEffect(() => {
    // 检查 WebSocket 连接状态
    const checkSocketStatus = () => {
      if (!gameSocket || !gameSocket.socket || typeof gameSocket.socket !== 'object') {
        setSocketStatus('no socket');
        return;
      }
      
      if ('readyState' in gameSocket.socket) {
        switch (gameSocket.socket.readyState) {
          case WebSocket.CONNECTING:
            setSocketStatus('connecting');
            break;
          case WebSocket.OPEN:
            setSocketStatus('connected');
            break;
          case WebSocket.CLOSING:
            setSocketStatus('closing');
            break;
          case WebSocket.CLOSED:
            setSocketStatus('closed');
            break;
          default:
            setSocketStatus('unknown');
        }
      } else {
        setSocketStatus('invalid');
      }
    };
    
    // 立即检查一次
    checkSocketStatus();
    
    // 设置定时检查
    const interval = setInterval(checkSocketStatus, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // 添加游戏状态同步功能
  useEffect(() => {
    if (!socket || !gameId.current) return;
    
    // 定期发送同步请求
    const syncInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        console.log('Sending sync request for game:', gameId.current);
        socket.send(JSON.stringify({
          type: 'SYNC_GAME',
          gameId: gameId.current,
          playerRole: playerRole
        }));
      }
    }, 10000); // 每10秒同步一次
    
    // 添加同步回调
    const syncCallback = (data: any) => {
      if (data.type === 'GAME_STATE' && data.gameState) {
        console.log('Received game state sync:', data.gameState);
        setGameState(data.gameState);
        setIsMyTurn(data.gameState.currentPlayer === myPlayerIndex);
      }
    };
    
    setSocketCallbacks(prev => ({
      ...prev,
      GAME_STATE: [...(prev.GAME_STATE || []), syncCallback]
    }));
    
    return () => {
      clearInterval(syncInterval);
      setSocketCallbacks(prev => ({
        ...prev,
        GAME_STATE: (prev.GAME_STATE || []).filter(cb => cb !== syncCallback)
      }));
    };
  }, [socket, gameId, playerRole, myPlayerIndex]);

  // 添加定期同步功能
  useEffect(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !gameId.current || isAIPlayer) {
      return;
    }
    
    console.log('设置定期同步');
    
    // 每 3 秒同步一次游戏状态
    const syncInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        const syncMessage = {
          type: 'SYNC_GAME',
          gameId: gameId.current,
          playerRole: playerRole
        };
        console.log('发送定期同步请求');
        socket.send(JSON.stringify(syncMessage));
      }
    }, 3000);
    
    return () => {
      clearInterval(syncInterval);
    };
  }, [socket, gameId, playerRole, isAIPlayer]);

  // 添加调试按钮
  const debugGameState = () => {
    console.log('Current Game State:', gameState);
    console.log('Is My Turn:', isMyTurn);
    console.log('Player Role:', playerRole);
    console.log('My Player Index:', myPlayerIndex);
    console.log('Game ID:', gameId.current);
    console.log('Socket Status:', socket ? socket.readyState : 'No Socket');
    
    // 尝试手动触发同步
    if (socket && socket.readyState === WebSocket.OPEN && gameId.current) {
      socket.send(JSON.stringify({
        type: 'SYNC_GAME',
        gameId: gameId.current,
        playerRole: playerRole
      }));
      console.log('Manual sync request sent');
    }
  };

  return (
    <Box sx={{ p: 2, minHeight: '100vh', background: bgImageLoaded ? `url(${getAssetPath('bg.png')}) no-repeat center/cover` : '#f5f5f5' }}>
      {/* 添加 WebSocket 状态指示器 */}
      <Typography 
        variant="caption" 
        sx={{ 
          position: 'absolute', 
          top: 5, 
          right: 5, 
          bgcolor: socketStatus === 'connected' ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)',
          p: 0.5,
          borderRadius: 1
        }}
      >
        Socket: {socketStatus}
      </Typography>
      
      {notification && (
        <Typography 
          variant="h6" 
          sx={{ 
            textAlign: 'center', 
            mb: 2, 
            p: 1, 
            bgcolor: 'rgba(255, 255, 255, 0.8)', 
            borderRadius: 1,
            fontFamily: '"Press Start 2P", cursive'
          }}
        >
          {notification}
        </Typography>
      )}
      
      {/* 添加当前回合指示器 */}
      {!gameOver && !isAIPlayer && (
        <Typography 
          variant="h6" 
          sx={{ 
            textAlign: 'center', 
            mb: 2, 
            p: 1, 
            bgcolor: isMyTurn ? 'rgba(144, 238, 144, 0.8)' : 'rgba(255, 200, 200, 0.8)', 
            borderRadius: 1,
            fontFamily: '"Press Start 2P", cursive'
          }}
        >
          {isMyTurn ? "Your Turn" : "Opponent's Turn"}
        </Typography>
      )}
      
      <Grid container spacing={4} justifyContent="center" alignItems="center">
        <Grid item xs={12} sm={3} md={2}>
          <Card sx={{ boxShadow: 'inset 2px 2px 5px rgba(0, 0, 0, 0.3)' }}>
            <CardHeader
              avatar={
                <SafeAvatar 
                  src={gameState.players[1].avatar} 
                  fallbackSrc="/assets/2.png"
                  sx={{ width: 100, height: 100 }} 
                />
              }
              title={gameState.players[1].name}
              titleTypographyProps={{ variant: 'h6', fontFamily: '"Press Start 2P", cursive' }}
              subheader={`Points: ${gameState.players[1].score}`}
              subheaderTypographyProps={{ variant: 'subtitle1', fontFamily: '"Press Start 2P", cursive' }}
            />
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={8}>
          <Card sx={{ 
            p: 2, 
            background: bgImageLoaded 
              ? `url(${getAssetPath('wooden.png')}) no-repeat center/cover` 
              : '#8B4513' 
          }}>
            <Board gameState={gameState} onPitClick={handlePitClick} />
          </Card>
        </Grid>
        <Grid item xs={12} sm={3} md={2}>
          <Card sx={{ boxShadow: 'inset 2px 2px 5px rgba(0, 0, 0, 0.3)' }}>
            <CardHeader
              avatar={
                <SafeAvatar 
                  src={gameState.players[0].avatar} 
                  fallbackSrc="/assets/1.png"
                  sx={{ width: 100, height: 100 }} 
                />
              }
              title={gameState.players[0].name}
              titleTypographyProps={{ variant: 'h6', fontFamily: '"Press Start 2P", cursive' }}
              subheader={`Points: ${gameState.players[0].score}`}
              subheaderTypographyProps={{ variant: 'subtitle1', fontFamily: '"Press Start 2P", cursive' }}
            />
          </Card>
        </Grid>
      </Grid>
      <Button variant="contained" color="primary" onClick={restartGame} sx={{ mt: 3, fontFamily: '"Press Start 2P", cursive' }}>Restart Game</Button>
      <Leaderboard />
      <SimpleConfetti active={showConfetti} count={150} />
      {gameOver && (
        <Dialog 
          open={gameOver} 
          onClose={() => {
            setGameOver(false);
            setShowConfetti(false);
          }}
          PaperProps={{
            sx: {
              borderRadius: '15px',
              border: '3px solid gold',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
              background: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)',
              p: 2
            }
          }}
        >
          <DialogTitle sx={{ 
            fontFamily: '"Press Start 2P", cursive',
            color: 'gold',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1
          }}>
            <Celebration sx={{ color: 'gold' }} />
            Game Over
            <Celebration sx={{ color: 'gold' }} />
          </DialogTitle>
          <DialogContent>
            <Typography 
              variant="h6" 
              sx={{ 
                fontFamily: '"Press Start 2P", cursive',
                color: 'white',
                textAlign: 'center',
                my: 2
              }}
            >
              {winner}
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              gap: 2,
              my: 2
            }}>
              <Avatar 
                src={gameState.players[0].avatar} 
                sx={{ width: 60, height: 60, border: '2px solid white' }} 
              />
              <Typography sx={{ fontFamily: '"Press Start 2P", cursive', fontSize: '1.5rem', color: 'white' }}>
                {gameState.players[0].score}
              </Typography>
              <Typography sx={{ fontFamily: '"Press Start 2P", cursive', fontSize: '1rem', color: 'white' }}>
                vs
              </Typography>
              <Typography sx={{ fontFamily: '"Press Start 2P", cursive', fontSize: '1.5rem', color: 'white' }}>
                {gameState.players[1].score}
              </Typography>
              <Avatar 
                src={gameState.players[1].avatar} 
                sx={{ width: 60, height: 60, border: '2px solid white' }} 
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setGameOver(false);
                setShowConfetti(false);
                window.location.reload();
              }}
              sx={{ 
                fontFamily: '"Press Start 2P", cursive',
                px: 3,
                py: 1,
                borderRadius: '10px',
                background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
              }}
            >
              Play Again
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {/* 添加调试按钮 - 仅在开发环境显示 */}
      {process.env.NODE_ENV === 'development' && (
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={debugGameState}
          sx={{ position: 'absolute', bottom: 10, right: 10 }}
        >
          Debug
        </Button>
      )}
      {/* 添加调试按钮 */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ position: 'absolute', bottom: 10, right: 10, zIndex: 1000 }}>
          <Button 
            variant="contained" 
            color="secondary" 
            size="small"
            onClick={() => {
              if (socket && socket.readyState === WebSocket.OPEN && gameId.current) {
                socket.send(JSON.stringify({
                  type: 'SYNC_GAME',
                  gameId: gameId.current,
                  playerRole: playerRole
                }));
                console.log('手动同步请求已发送');
              } else {
                console.error('无法发送同步请求');
              }
            }}
          >
            同步游戏
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default GamePage;
