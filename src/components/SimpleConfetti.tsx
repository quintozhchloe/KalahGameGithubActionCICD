import React, { useEffect, useState } from 'react';
import '../styles/Confetti.css';

interface SimpleConfettiProps {
  active: boolean;
  count?: number;
}

interface ConfettiItem {
  id: number;
  left: string;
  animationDelay: string;
  top: string;
}

const SimpleConfetti: React.FC<SimpleConfettiProps> = ({ active, count = 100 }) => {
  // 使用普通对象数组而不是JSX元素数组
  const [confettiItems, setConfettiItems] = useState<ConfettiItem[]>([]);
  
  useEffect(() => {
    if (active) {
      const newConfetti: ConfettiItem[] = [];
      for (let i = 0; i < count; i++) {
        const left = Math.random() * 100;
        const animationDelay = Math.random() * 5;
        newConfetti.push({
          id: i,
          left: `${left}%`,
          animationDelay: `${animationDelay}s`,
          top: `-${Math.random() * 100}px`
        });
      }
      setConfettiItems(newConfetti);
      
      // 5秒后清除纸屑
      const timer = setTimeout(() => {
        setConfettiItems([]);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setConfettiItems([]);
    }
  }, [active, count]);
  
  if (!active || confettiItems.length === 0) {
    return null;
  }
  
  return (
    <div className="confetti-container">
      {confettiItems.map(item => (
        <div 
          key={item.id} 
          className="confetti" 
          style={{
            left: item.left,
            animationDelay: item.animationDelay,
            top: item.top
          }} 
        />
      ))}
    </div>
  );
};

export default SimpleConfetti;

