/**
 * 确保图片URL是完整的
 * @param url 图片URL
 * @returns 完整的图片URL
 */
export const getFullImageUrl = (url: string | null | undefined): string => {
  if (!url) {
    return '/assets/default-avatar.png'; // 默认头像
  }
  
  // 如果已经是完整URL，直接返回
  if (url.startsWith('http') || url.startsWith('data:')) {
    return url;
  }
  
  // 如果是相对路径但已经包含/assets，则直接使用
  if (url.startsWith('/assets/')) {
    return url;
  }
  
  // 如果是后端API返回的路径，添加API基础URL
  const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  
  // 确保路径格式正确
  if (!url.startsWith('/')) {
    url = `/${url}`;
  }
  
  return `${apiBaseUrl}${url}`;
};

/**
 * 检查图片是否存在
 * @param url 图片URL
 * @returns Promise<boolean>
 */
export const checkImageExists = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
};
