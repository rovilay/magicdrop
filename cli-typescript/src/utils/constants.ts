import path from 'path';

export const ERROR_MESSAGES = {
  INVALID_OPTION: 'Invalid option selected. Please try again.',
  FILE_NOT_FOUND: 'The specified file could not be found.',
  DEPLOYMENT_FAILED: 'Contract deployment failed. Please check the logs.',
  CONTRACT_NOT_FOUND:
    'Contract not found. Please ensure the contract address is correct.',
};

export const SUCCESS_MESSAGES = {
  DEPLOYMENT_SUCCESS: 'Contract deployed successfully!',
  CONTRACT_MANAGED: 'Contract managed successfully!',
  TOKEN_OPERATION_SUCCESS: 'Token operation completed successfully!',
};

export const CONFIG = {
  DEFAULT_COLLECTION_FILE: 'default_collection.json',
  MAX_RETRIES: 3,
};

export const DEFAULT_COLLECTION_DIR = path.resolve(
  __dirname,
  '../../collections',
);

export const ME_TRANSFER_VALIDATOR_V3 =
  '0x721C00D4FB075b22a5469e9CF2440697F729aA13';
export const LIMITBREAK_TRANSFER_VALIDATOR_V3 =
  '0x721C0078c2328597Ca70F5451ffF5A7B38D4E947';
export const LIMITBREAK_TRANSFER_VALIDATOR_V3_ABSTRACT =
  '0x3203c3f64312AF9344e42EF8Aa45B97C9DFE4594';
export const LIMITBREAK_TRANSFER_VALIDATOR_V3_BERACHAIN =
  '0x721c002b0059009a671d00ad1700c9748146cd1b';

export const ABSTRACT_FACTORY_ADDRESS =
  '0x4a08d3F6881c4843232EFdE05baCfb5eAaB35d19';
export const AVALANCHE_FACTORY_ADDRESS =
  '0x0b49bDcf2eC9329Fa6F42DCCC66e8906a3E4ACF0';
export const DEFAULT_FACTORY_ADDRESS =
  '0x000000009e44eBa131196847C685F20Cd4b68aC4';

export const ABSTRACT_REGISTRY_ADDRESS =
  '0x9b60ad31F145ec7EE3c559153bB57928B65C0F87';
export const AVALANCHE_REGISTRY_ADDRESS =
  '0x09E0135dfBb7528D6eAA5beB69f3C030dF26F57c';
export const DEFAULT_REGISTRY_ADDRESS =
  '0x00000000caF1E3978e291c5Fb53FeedB957eC146';

export const ICREATOR_TOKEN_INTERFACE_ID = '0xad0d7f6c'; // type(ICreatorToken).interfaceId
export const TRUE_HEX =
  '0x0000000000000000000000000000000000000000000000000000000000000001';

// Used on chains where we don't have a custom list
export const DEFAULT_LIST_ID = 0;
export const MAGIC_EDEN_DEFAULT_LIST_ID = 1;
// We use list 3 for Polygon because list 1 was already taken.
export const MAGIC_EDEN_POLYGON_LIST_ID = 3;

export const DEFAULT_IMPL_ID = 0;

export enum TOKEN_STANDARD {
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}

export enum SUPPORTED_CHAINS {
  APECHAIN = 33139,
  ARBITRUM = 42161,
  BASE = 8453,
  ETHEREUM = 1,
  POLYGON = 137,
  SEI = 1329,
  SEPOLIA = 11155111,
  BSC = 56,
  AVALANCHE = 43114,
  ABSTRACT = 2741,
  BERACHAIN = 80094,
  MONAD_TESTNET = 10143,
}

export const supportedChainNames: { [key in SUPPORTED_CHAINS]: string } = {
  [SUPPORTED_CHAINS.APECHAIN]: 'apechain',
  [SUPPORTED_CHAINS.ARBITRUM]: 'arbitrum',
  [SUPPORTED_CHAINS.BASE]: 'base',
  [SUPPORTED_CHAINS.ETHEREUM]: 'ethereum',
  [SUPPORTED_CHAINS.POLYGON]: 'polygon',
  [SUPPORTED_CHAINS.SEI]: 'sei',
  [SUPPORTED_CHAINS.SEPOLIA]: 'sepolia',
  [SUPPORTED_CHAINS.BSC]: 'bsc',
  [SUPPORTED_CHAINS.AVALANCHE]: 'avalanche',
  [SUPPORTED_CHAINS.ABSTRACT]: 'abstract',
  [SUPPORTED_CHAINS.BERACHAIN]: 'berachain',
  [SUPPORTED_CHAINS.MONAD_TESTNET]: 'monadTestnet',
};

export const rpcUrls: { [chainId in SUPPORTED_CHAINS]: string } = {
  [SUPPORTED_CHAINS.ETHEREUM]:
    'https://evm-router.magiceden.io/ethereum/mainnet/me2024', // Ethereum
  [SUPPORTED_CHAINS.BSC]: 'https://evm-router.magiceden.io/bsc/mainnet/me2024', // BSC
  [SUPPORTED_CHAINS.POLYGON]:
    'https://evm-router.magiceden.io/polygon/mainnet/me2024', // Polygon
  [SUPPORTED_CHAINS.BASE]:
    'https://evm-router.magiceden.io/base/mainnet/me2024', // Base
  [SUPPORTED_CHAINS.ARBITRUM]:
    'https://evm-router.magiceden.io/arbitrum/mainnet/me2024', // Arbitrum
  [SUPPORTED_CHAINS.SEI]: 'https://evm-router.magiceden.io/sei/mainnet/me2024', // Sei
  [SUPPORTED_CHAINS.APECHAIN]:
    'https://evm-router.magiceden.io/apechain/mainnet/me2024', // ApeChain
  [SUPPORTED_CHAINS.SEPOLIA]:
    'https://evm-router.magiceden.io/ethereum/sepolia/me2024', // Sepolia
  [SUPPORTED_CHAINS.ABSTRACT]:
    'https://evm-router.magiceden.io/abstract/mainnet/me2024', // Abstract
  [SUPPORTED_CHAINS.BERACHAIN]:
    'https://evm-router.magiceden.io/berachain/mainnet/me2024"', // Berachain
  [SUPPORTED_CHAINS.MONAD_TESTNET]:
    'https://evm-router.magiceden.io/monad/testnet/me2024', // Monad Testnet
  [SUPPORTED_CHAINS.AVALANCHE]:
    'https://evm-router.magiceden.io/avalanche/mainnet/me2024', // Avalanche
};

export const explorerUrls: { [chainId in SUPPORTED_CHAINS]: string } = {
  [SUPPORTED_CHAINS.ETHEREUM]: 'https://etherscan.io', // Ethereum
  [SUPPORTED_CHAINS.BSC]: 'https://bscscan.com', // BSC
  [SUPPORTED_CHAINS.POLYGON]: 'https://polygonscan.com', // Polygon
  [SUPPORTED_CHAINS.BASE]: 'https://basescan.org', // Base
  [SUPPORTED_CHAINS.ARBITRUM]: 'https://arbiscan.io', // Arbitrum
  [SUPPORTED_CHAINS.SEI]: 'https://seitrace.com', // Sei
  [SUPPORTED_CHAINS.APECHAIN]: 'https://apescan.io', // ApeChain
  [SUPPORTED_CHAINS.SEPOLIA]: 'https://sepolia.etherscan.io', // Sepolia
  [SUPPORTED_CHAINS.ABSTRACT]: 'https://abscan.org', // Abstract
  [SUPPORTED_CHAINS.BERACHAIN]: 'https://berascan.com', // Berachain
  [SUPPORTED_CHAINS.MONAD_TESTNET]: 'https://testnet.monadexplorer.com', // Monad Testnet
  [SUPPORTED_CHAINS.AVALANCHE]: 'https://snowtrace.io', // Avalanche
};

export const DEFAULT_TOKEN_URI_SUFFIX = '.json';
export const DEFAULT_ROYALTY_RECEIVER =
  '0x0000000000000000000000000000000000000000';
export const DEFAULT_ROYALTY_FEE = 0;
export const DEFAULT_COSIGNER = '0x0000000000000000000000000000000000000000';
export const DEFAULT_TIMESTAMP_EXPIRY = 300;
export const DEFAULT_MINT_CURRENCY =
  '0x0000000000000000000000000000000000000000';
export const DEFAULT_MERKLE_ROOT =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

export const STANDARD_GAS_LIMIT = 21000; // Standard gas limit for native transfers
