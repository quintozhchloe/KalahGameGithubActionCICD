const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
let waitingPlayer = null;

// 存储活跃游戏的映射
const activeGames = new Map(); // 格式: { gameId: { player1: ws1, player2: ws2, gameState: {...} } }

// 添加服务器启动日志
console.log('WebSocket server starting on port 8080...');

wss.on('connection', (ws) => {
  console.log('Player connected');
  
  // 添加连接ID以便于调试
  const connectionId = Date.now();
  ws.connectionId = connectionId;
  console.log(`Connection established: #${connectionId}`);
  
  // 保持连接活跃
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  // Handle messages from clients
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Received message from #${connectionId}:`, data);
      
      // Handle find match request
      if (data.type === 'FIND_MATCH') {
        console.log(`Player #${connectionId} is looking for a match`);
        handleFindMatch(ws, data.player, connectionId);
      }
      
      // 处理游戏操作
      if (data.type === 'GAME_MOVE') {
        console.log(`Player #${connectionId} made a move:`, data.move);
        handleGameMove(ws, data.gameId, data.move, data.gameState);
      }
      
      // 处理游戏创建
      if (data.type === 'CREATE_GAME') {
        console.log(`Creating game for players: ${data.player1Id} and ${data.player2Id}`);
        createGame(ws, data.gameId, data.player1Id, data.player2Id);
      }
      
      // 处理加入游戏请求
      if (data.type === 'JOIN_GAME') {
        console.log(`Player #${connectionId} joining game ${data.gameId} as ${data.playerRole}`);
        
        const game = activeGames.get(data.gameId);
        if (game) {
          // 将玩家添加到游戏中
          if (data.playerRole === 'player1') {
            game.player1 = { ws, playerInfo: data };
          } else if (data.playerRole === 'player2') {
            game.player2 = { ws, playerInfo: data };
          }
          
          // 发送当前游戏状态
          ws.send(JSON.stringify({
            type: 'GAME_STATE',
            gameState: game.gameState
          }));
          
          console.log(`Player added to game ${data.gameId} as ${data.playerRole}`);
        } else {
          console.error(`Game ${data.gameId} not found`);
          ws.send(JSON.stringify({
            type: 'ERROR',
            message: `Game ${data.gameId} not found`
          }));
        }
      }

      // 处理游戏同步
      if (data.type === 'SYNC_GAME') {
        console.log(`Player #${connectionId} requesting sync for game ${data.gameId}`);
        
        const game = activeGames.get(data.gameId);
        if (game && game.gameState) {
          ws.send(JSON.stringify({
            type: 'GAME_STATE',
            gameState: game.gameState
          }));
          console.log(`Sent game state to player #${connectionId} for game ${data.gameId}`);
        } else {
          console.error(`Game ${data.gameId} not found or has no state`);
          ws.send(JSON.stringify({
            type: 'ERROR',
            message: `Game ${data.gameId} not found or has no state`
          }));
        }
      }

      // 处理游戏结束
      if (data.type === 'GAME_OVER') {
        console.log(`Game ${data.gameId} is over. Winner: ${data.winner}`);
        
        const game = activeGames.get(data.gameId);
        if (game) {
          // 更新游戏状态
          game.gameState = data.gameState;
          game.isOver = true;
          
          // 确定是哪个玩家发送的消息
          const isPlayer1 = game.player1.ws === ws;
          const opponent = isPlayer1 ? game.player2.ws : game.player1.ws;
          
          // 将游戏结束消息发送给对手
          if (opponent && opponent.readyState === WebSocket.OPEN) {
            opponent.send(JSON.stringify({
              type: 'GAME_OVER',
              gameState: data.gameState,
              winner: data.winner
            }));
            console.log(`Game over notification sent to opponent in game ${data.gameId}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing message from #${connectionId}:`, error);
    }
  });

  ws.on('close', () => {
    if (waitingPlayer && waitingPlayer.ws === ws) {
      console.log(`Waiting player #${connectionId} disconnected`);
      waitingPlayer = null;
    } else {
      console.log(`Player #${connectionId} disconnected`);
      
      // 检查是否是活跃游戏中的玩家
      for (const [gameId, game] of activeGames.entries()) {
        if (game.player1.ws === ws || game.player2.ws === ws) {
          console.log(`Player in game ${gameId} disconnected`);
          
          // 通知另一个玩家
          const otherPlayer = game.player1.ws === ws ? game.player2.ws : game.player1.ws;
          if (otherPlayer && otherPlayer.readyState === WebSocket.OPEN) {
            otherPlayer.send(JSON.stringify({
              type: 'OPPONENT_DISCONNECTED'
            }));
          }
        }
      }
    }
  });
  
  // 发送连接确认消息
  ws.send(JSON.stringify({ type: 'connected', id: connectionId }));
});

// 处理游戏移动
function handleGameMove(ws, gameId, move, newGameState) {
  console.log(`Processing move in game ${gameId}. Move:`, move);
  
  const game = activeGames.get(gameId);
  if (!game) {
    console.error(`Game ${gameId} not found. Active games:`, Array.from(activeGames.keys()));
    return;
  }
  
  // Update game state
  game.gameState = newGameState;
  console.log(`Game ${gameId} state updated`);
  
  // Determine which player sent the move
  const isPlayer1 = game.player1.ws === ws;
  const opponent = isPlayer1 ? game.player2.ws : game.player1.ws;
  
  console.log(`Move from ${isPlayer1 ? 'player1' : 'player2'} in game ${gameId}`);
  
  // Send move to opponent
  if (opponent && opponent.readyState === WebSocket.OPEN) {
    const message = JSON.stringify({
      type: 'OPPONENT_MOVE',
      move: move,
      gameState: newGameState
    });
    
    try {
      opponent.send(message);
      console.log(`Move sent to opponent`);
    } catch (error) {
      console.error(`Error sending move to opponent:`, error);
    }
  } else {
    console.error(`Opponent not available. Opponent connection status:`, opponent ? opponent.readyState : 'null');
  }
}

// 处理游戏同步
function handleGameSync(ws, gameId, playerRole) {
  console.log(`Processing sync request for game ${gameId}`);
  
  const game = activeGames.get(gameId);
  if (!game || !game.gameState) {
    console.error(`Game ${gameId} not found or has no state`);
    return;
  }
  
  // Send current game state
  const message = JSON.stringify({
    type: 'GAME_STATE',
    gameState: game.gameState
  });
  
  try {
    ws.send(message);
    console.log(`Game state sent to client`);
  } catch (error) {
    console.error(`Error sending game state:`, error);
  }
}

// 创建游戏
function createGame(ws, gameId, player1Id, player2Id) {
  // 查找玩家连接
  let player1Ws = null;
  let player2Ws = null;
  
  // 遍历所有连接找到玩家
  wss.clients.forEach((client) => {
    if (client.playerId === player1Id) {
      player1Ws = client;
    } else if (client.playerId === player2Id) {
      player2Ws = client;
    }
  });
  
  if (!player1Ws || !player2Ws) {
    console.error(`Cannot create game: players not found`);
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Players not found' }));
    return;
  }
  
  // 创建游戏
  activeGames.set(gameId, {
    player1: { ws: player1Ws, id: player1Id },
    player2: { ws: player2Ws, id: player2Id },
    gameState: null
  });
  
  console.log(`Game ${gameId} created between players ${player1Id} and ${player2Id}`);
  
  // 通知两个玩家游戏已创建
  player1Ws.send(JSON.stringify({ type: 'GAME_CREATED', gameId }));
  player2Ws.send(JSON.stringify({ type: 'GAME_CREATED', gameId }));
}

// 修改匹配函数，添加游戏ID
function handleFindMatch(ws, playerInfo, connectionId) {
  // 存储玩家ID
  ws.playerId = playerInfo.id;
  
  console.log(`Processing match request for #${connectionId}`);
  console.log(`Current waiting player: ${waitingPlayer ? waitingPlayer.connectionId : 'none'}`);
  
  if (waitingPlayer) {
    // Match found
    console.log(`Match found between #${connectionId} and #${waitingPlayer.connectionId}`);
    
    // 创建游戏ID
    const gameId = `game_${Date.now()}`;
    console.log(`Creating game with ID: ${gameId}`);
    
    // Send match found message to both players
    const player2Message = JSON.stringify({ 
      type: 'MATCH_FOUND', 
      role: 'player2',
      opponent: waitingPlayer.playerInfo,
      gameId: gameId
    });
    
    const player1Message = JSON.stringify({ 
      type: 'MATCH_FOUND', 
      role: 'player1',
      opponent: playerInfo,
      gameId: gameId
    });
    
    console.log(`Sending to player2:`, player2Message);
    ws.send(player2Message);
    
    console.log(`Sending to player1:`, player1Message);
    waitingPlayer.ws.send(player1Message);
    
    // 创建游戏
    activeGames.set(gameId, {
      player1: { ws: waitingPlayer.ws, id: waitingPlayer.playerInfo.id },
      player2: { ws: ws, id: playerInfo.id },
      gameState: null,
      createdAt: Date.now()
    });
    
    console.log(`Game ${gameId} created. Active games:`, Array.from(activeGames.keys()));
    
    // Reset waiting player
    const previousWaitingPlayer = waitingPlayer;
    waitingPlayer = null;
    console.log(`Waiting player reset. Previous: #${previousWaitingPlayer.connectionId}, Current: none`);
  } else {
    // No waiting player, add this player to waiting queue
    console.log(`No waiting player found. Adding #${connectionId} to waiting queue`);
    waitingPlayer = { ws, playerInfo, connectionId };
    ws.send(JSON.stringify({ type: 'WAITING' }));
  }
}

console.log('WebSocket server running on port 8080');

// 添加心跳检测，保持连接活跃
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`Terminating inactive connection #${ws.connectionId}`);
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
  console.log('WebSocket server closed');
});
