/**
 * 判断当前是否是测试环境
 * 测试环境定义：域名包含 'test' 或者 localhost
 * 生产环境：其他所有情况
 */
export const isTestEnvironment = (): boolean => {
  // 服务端渲染时，默认为生产环境
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'development';
  }

  // 客户端环境下，根据域名判断
  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname.includes('test') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1'
  );
};

/**
 * 根据环境返回 DAO 超时配置的默认值
 * 测试环境：10（分钟）
 * 生产环境：7200（分钟）
 */
export const getDefaultDaoTimeout = (type: 'register' | 'airdrop'): number => {
  const isTest = isTestEnvironment();

  if (type === 'register') {
    return isTest ? 10 : 7200;
  } else if (type === 'airdrop') {
    return isTest ? 10 : 7200;
  }

  return isTest ? 10 : 7200;
};
