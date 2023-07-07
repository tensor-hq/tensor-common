/** account === token */
export type ExplorerLinkType = 'tx' | 'account';

export enum Explorer {
  SolanaFM = 'SolanaFM',
  Solscan = 'Solscan',
  XRAY = 'XRAY',
  SolanaExplorer = 'Solana Explorer',
}

export const explorerLink = (
  exp: Explorer,
  type: ExplorerLinkType,
  id: string,
): string => {
  switch (exp) {
    case Explorer.SolanaFM:
      return `https://solana.fm/${type === 'account' ? 'address' : type}/${id}`;
    case Explorer.Solscan:
      return `https://solscan.io/${type}/${id}`;
    case Explorer.XRAY:
      return `https://xray.helius.xyz/${
        type === 'account' ? 'token' : type
      }/${id}`;
    case Explorer.SolanaExplorer:
      return `https://explorer.solana.com/${
        type === 'account' ? 'address' : type
      }/${id}`;
  }
};
