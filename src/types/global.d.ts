import { GameSocket } from '../services/socket';

declare global {
  interface Window {
    gameSocket?: GameSocket;
  }
}