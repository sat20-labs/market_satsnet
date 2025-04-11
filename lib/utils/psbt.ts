export const psbtHex2Base64 = (psbtHex: string) => {
  return Buffer.from(psbtHex, 'hex').toString('base64');
};
