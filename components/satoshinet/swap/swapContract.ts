export const resolveSwapContractUrl = (
  deployedContracts: unknown,
  asset: string,
  requestedContractUrl?: string,
): string | undefined => {
  if (!asset || !Array.isArray(deployedContracts)) {
    return undefined;
  }

  const expectedSuffix = `_${asset}_amm.tc`;
  const matchingContracts = deployedContracts.filter(
    (url): url is string => typeof url === 'string' && url.endsWith(expectedSuffix),
  );

  if (requestedContractUrl && matchingContracts.includes(requestedContractUrl)) {
    return requestedContractUrl;
  }

  return matchingContracts[0];
};
