/**
 * 获取静态资源的完整路径
 * @param path 资源路径
 * @returns 完整的资源路径
 */
export const getAssetPath = (path: string): string => {
  // 如果已经是完整路径，直接返回
  if (path.startsWith('http') || path.startsWith('data:')) {
    return path;
  }
  
  // 如果是相对路径，确保格式正确
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  
  // 如果路径不包含assets，添加assets前缀
  if (!path.includes('/assets/')) {
    path = path.replace('/', '/assets/');
  }
  
  // 在开发环境中，静态资源可能在public文件夹下
  const publicUrl = process.env.PUBLIC_URL || '';
  return `${publicUrl}${path}`;
};

/**
 * 检查资源是否存在
 * @param path 资源路径
 * @returns Promise<boolean>
 */
export const checkAssetExists = (path: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const fullPath = getAssetPath(path);
    
    // 对于图片资源
    if (fullPath.match(/\.(jpeg|jpg|gif|png|svg)$/i)) {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = fullPath;
      return;
    }
    
    // 对于其他资源，尝试使用fetch检查
    fetch(fullPath, { method: 'HEAD' })
      .then(response => resolve(response.ok))
      .catch(() => resolve(false));
  });
};
