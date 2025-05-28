import React, { useState, useEffect } from 'react';
import { getFullImageUrl } from '../utils/imageUtils';
import { CircularProgress } from '@mui/material';

interface SafeImageProps {
  src: string | null | undefined;
  alt?: string;
  fallbackSrc?: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
}

const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt = 'Image',
  fallbackSrc = '/assets/default-avatar.png',
  className,
  style,
  width,
  height
}) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    
    const fullUrl = getFullImageUrl(src);
    console.log(`Loading image from: ${fullUrl}`);
    
    const img = new Image();
    img.onload = () => {
      setImgSrc(fullUrl);
      setIsLoading(false);
    };
    img.onerror = () => {
      console.error(`Failed to load image: ${fullUrl}`);
      setImgSrc(fallbackSrc);
      setHasError(true);
      setIsLoading(false);
    };
    img.src = fullUrl;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, fallbackSrc]);

  if (isLoading) {
    return (
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: width || '100%',
          height: height || '100%',
          ...style
        }}
        className={className}
      >
        <CircularProgress size={24} />
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      style={{
        ...style,
        width: width,
        height: height
      }}
      onError={() => {
        if (!hasError) {
          setImgSrc(fallbackSrc);
          setHasError(true);
        }
      }}
    />
  );
};

export default SafeImage;