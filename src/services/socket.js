// 单例模式确保只有一个 WebSocket 连接
let instance = null;

export class GameSocket {
  constructor() {
    if (instance) {
      console.log('Returning existing GameSocket instance');
      return instance;
    }
    
    console.log('Creating new GameSocket instance with ID:', Date.now());
    this.instanceId = Date.now();
    this.callbacks = {
      MATCH_FOUND: [],
      AI_MATCH: [],
      OPPONENT_MOVE: [], 
      GAME_CREATED: [],
      WAITING: []
    };
    this.onOpenCallback = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    this.connect();
    
    instance = this;
    
    // 为调试目的暴露到 window 对象
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.gameSocket = this;
      console.log('GameSocket instance exposed to window.gameSocket');
    }
  }

  connect() {
    console.log(`[Socket ${this.instanceId}] Connecting to WebSocket server...`);
    this.socket = new WebSocket('ws://localhost:8080');
    
    this.socket.onmessage = (event) => {
      try {
        console.log(`[Socket ${this.instanceId}] Raw message received:`, event.data);
        const data = JSON.parse(event.data);
        console.log(`[Socket ${this.instanceId}] Parsed message:`, data);
        
        if (data.type && this.callbacks[data.type]) {
          console.log(`[Socket ${this.instanceId}] Calling ${this.callbacks[data.type].length} callbacks for event ${data.type}`);
          this.callbacks[data.type].forEach(cb => cb(data));
        }
      } catch (error) {
        console.error(`[Socket ${this.instanceId}] Error processing socket message:`, error);
      }
    };
    
    this.socket.onopen = () => {
      console.log(`[Socket ${this.instanceId}] WebSocket connection established`);
      this.reconnectAttempts = 0;
      if (this.onOpenCallback) {
        this.onOpenCallback();
      }
    };
    
    this.socket.onclose = (event) => {
      console.log(`[Socket ${this.instanceId}] WebSocket connection closed:`, event.code, event.reason);
      
      // 尝试重连
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`[Socket ${this.instanceId}] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(), 2000);
      } else {
        console.error(`[Socket ${this.instanceId}] Max reconnect attempts reached. Giving up.`);
        // 重置实例，允许重新连接
        if (instance === this) {
          instance = null;
        }
      }
    };
    
    this.socket.onerror = (error) => {
      console.error(`[Socket ${this.instanceId}] WebSocket error:`, error);
    };
  }

  findMatch(playerInfo) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'FIND_MATCH',
        player: playerInfo
      }));
    } else {
      console.error('Cannot send findMatch: WebSocket not open');
    }
  }
  
  sendMove(gameId, move, gameState) {
    if (this.socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'GAME_MOVE',
        gameId,
        move,
        gameState
      });
      console.log(`[Socket ${this.instanceId}] Sending move:`, message);
      this.socket.send(message);
    } else {
      console.error(`[Socket ${this.instanceId}] Cannot send move: WebSocket not open (readyState: ${this.socket.readyState})`);
    }
  }
  
  createGame(gameId, player1Id, player2Id) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'CREATE_GAME',
        gameId,
        player1Id,
        player2Id
      }));
    } else {
      console.error('Cannot create game: WebSocket not open');
    }
  }

  on(event, callback) {
    console.log(`[Socket ${this.instanceId}] Registering callback for event: ${event}`);
    
    if (!this.callbacks[event]) {
      console.warn(`[Socket ${this.instanceId}] Creating callback array for event: ${event}`);
      this.callbacks[event] = [];
    }
    
    this.callbacks[event].push(callback);
    console.log(`[Socket ${this.instanceId}] Added callback for ${event}. Total callbacks: ${this.callbacks[event].length}`);
    
    // 打印所有注册的事件和回调数量
    console.log(`[Socket ${this.instanceId}] All registered callbacks:`, 
      Object.entries(this.callbacks).map(([k, v]) => `${k}: ${v.length}`).join(', '));
  }
  
  onOpen(callback) {
    this.onOpenCallback = callback;
    // 如果已经连接，立即调用
    if (this.socket.readyState === WebSocket.OPEN) {
      callback();
    }
  }
}

// 确保导出的是单例
export const gameSocket = new GameSocket();

// 再次为调试目的暴露到 window 对象
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.gameSocket = gameSocket;
  console.log('GameSocket singleton exposed to window.gameSocket');
}









