import React from 'react';
import { Avatar, AvatarProps } from '@mui/material';
import { getFullImageUrl } from '../utils/imageUtils';

interface SafeAvatarProps extends Omit<AvatarProps, 'src'> {
  src?: string | null;
  fallbackSrc?: string;
}

const SafeAvatar: React.FC<SafeAvatarProps> = ({
  src,
  fallbackSrc = '/assets/default-avatar.png',
  alt = 'Avatar',
  ...props
}) => {
  const [imgSrc, setImgSrc] = React.useState<string>(getFullImageUrl(src));
  const [hasError, setHasError] = React.useState<boolean>(false);

  React.useEffect(() => {
    setImgSrc(getFullImageUrl(src));
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError) {
      console.error(`Failed to load avatar: ${imgSrc}`);
      setImgSrc(fallbackSrc);
      setHasError(true);
    }
  };

  return (
    <Avatar
      {...props}
      src={imgSrc}
      alt={alt}
      imgProps={{
        onError: handleError
      }}
    />
  );
};

export default SafeAvatar;
