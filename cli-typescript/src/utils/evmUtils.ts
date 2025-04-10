import { ethers } from 'ethers';
import { SUPPORTED_CHAINS, TOKEN_STANDARD } from './constants';
import { Collection } from './types';
import { showError } from './display';
import { getProjectStore } from './fileUtils';

export class EvmPlatform {
  name: string;
  coinSymbol: string;

  constructor(
    name: string,
    coinSymbol: string,
    public chainIdsMap: Map<string, SUPPORTED_CHAINS>,
    public defaultChain: string,
  ) {
    if (!chainIdsMap.has(defaultChain)) {
      throw new Error(
        `The given default chain name ${defaultChain} doesn't exist in the given constructor parameter chainIdsMap`,
      );
    }

    this.name = name;
    this.coinSymbol = coinSymbol;
  }

  isChainIdSupported(chainId: number): boolean {
    return (
      Array.from(this.chainIdsMap.values()).find((id) => id === chainId) !==
      undefined
    );
  }
}

/**
 * Validates the config loaded from the config file or CLI
 * @param platform the evm platform
 * @param config collection config
 * @param setupContract flag to setup contract after contract deployment
 * @returns
 */
export const validateConfig = (
  platform: EvmPlatform,
  config: Collection,
  setupContract?: boolean,
  totalTokens?: number,
): boolean => {
  const errors: string[] = [];

  if (
    !config.chainId ||
    typeof config.chainId !== 'number' ||
    !platform.isChainIdSupported(config.chainId)
  ) {
    errors.push(
      `Invalid or missing chainId. Try any of ${Array.from(platform.chainIdsMap.values())}`,
    );
  }

  if (
    !config.tokenStandard ||
    ![TOKEN_STANDARD.ERC721, TOKEN_STANDARD.ERC1155].includes(
      config.tokenStandard as any,
    )
  ) {
    errors.push(
      `Invalid or missing tokenStandard. Must be "${TOKEN_STANDARD.ERC721}" or "${TOKEN_STANDARD.ERC1155}".`,
    );
  }

  if (!config.name || typeof config.name !== 'string') {
    errors.push(
      'Invalid or missing collectionName.  Enter the `name` in the config file or pass the --name flag.',
    );
  }

  if (!config.symbol || typeof config.symbol !== 'string') {
    errors.push(
      'Invalid or missing symbol. Enter the `symbol` in the config file or pass the --symbol flag.',
    );
  }

  if (!config.cosigner || !ethers.isAddress(config.cosigner)) {
    errors.push(
      'Invalid or missing cosigner address. Enter the `cosigner` in the config file or pass the --cosigner flag.',
    );
  }

  if (!config.mintCurrency || !ethers.isAddress(config.mintCurrency)) {
    errors.push(
      'Invalid or missing mintCurrency address. It should a number. Enter the `mintCurrency` in the config file or pass the --mintCurrency flag if you want to setup contract.',
    );
  }

  if (!config.mintCurrency || typeof config.mintable !== 'boolean') {
    errors.push(
      'Invalid or missing mintable. It should either be true or false',
    );
  }

  if (config.tokenStandard === TOKEN_STANDARD.ERC721) {
    if (
      setupContract &&
      (config.globalWalletLimit === undefined ||
        isNaN(config.globalWalletLimit))
    ) {
      errors.push(
        'Invalid or missing globalWalletLimit. It should a number. Enter the `globalWalletLimit` in the config file or pass the --globalWalletLimit flag if you want to setup contract.',
      );
    }

    if (setupContract && isNaN(config.maxMintableSupply)) {
      errors.push('Invalid or missing maxMintableSupply. It should a number.');
    }

    if (typeof config.useERC721C !== 'boolean') {
      errors.push(
        'Invalid or missing useERC721C. It should either be true or false.',
      );
    }

    if (
      setupContract &&
      (!config.tokenUriSuffix || typeof config.tokenUriSuffix !== 'string')
    ) {
      errors.push(
        'Invalid or missing tokenUriSuffix. Enter the `tokenUriSuffix` in the config file or pass the --tokenUriSuffix flag if you want to setup contract.',
      );
    }
  }

  if (config.tokenStandard === TOKEN_STANDARD.ERC1155) {
    if (setupContract && !Array.isArray(config.globalWalletLimit)) {
      errors.push(
        'Invalid or missing globalWalletLimit. It should be an array of numbers. Enter the `globalWalletLimit` in the config file or pass the --globalWalletLimit flag if you want to setup contract.',
      );
    }

    if (setupContract && !Array.isArray(config.maxMintableSupply)) {
      errors.push(
        'Invalid or missing maxMintableSupply. It should be an array of numbers. It should be an array of numbers. Enter the `maxMintableSupply` in the config file or pass the --maxMintableSupply flag if you want to setup contract.',
      );
    }

    if (setupContract && typeof totalTokens !== 'number') {
      errors.push(
        'Invalid or missing totalTokens. Pass the --totalTokens flag if you want to setup contract.',
      );
    }
  }

  if (setupContract) {
    if (!config.uri || typeof config.uri !== 'string') {
      errors.push(
        'Invalid or missing uri. Enter the `uri` in the config file or pass the --uri flag if you want to setup contract.',
      );
    }

    if (!config.fundReceiver || !ethers.isAddress(config.fundReceiver)) {
      errors.push(
        'Invalid or missing fundReceiver. Enter the `fundReceiver` in the config file or pass the --fundReceiver flag if you want to setup contract.',
      );
    }

    if (!config.royaltyReceiver || !ethers.isAddress(config.royaltyReceiver)) {
      errors.push(
        'Invalid or missing royaltyReceiver. Enter the `royaltyReceiver` in the config file or pass the --royaltyReceiver flag if you want to setup contract.',
      );
    }

    if (!config.royaltyFee || isNaN(config.royaltyFee)) {
      errors.push(
        'Invalid or missing royaltyFee. Enter the `royaltyFee` in the config file or pass the --royaltyFee flag if you want to setup contract.',
      );
    }
  }

  // If there are errors, log them and return false
  if (errors.length > 0) {
    console.error('Configuration validation failed with the following errors:');
    errors.forEach((error) => showError({ text: `- ${error}` }));
    return false;
  }

  // If no errors, return true
  return true;
};

export const init = (
  collectionName: string,
): { config: Collection; collectionConfigFile: string } => {
  // construct collection file path
  const store = getProjectStore(collectionName);

  if (!store.exists) {
    throw new Error(`Collection file not found: ${store.root}`);
  }

  // Step 1: Load config file via collectionConfigFile
  const config = store.read();

  if (!config) {
    throw new Error('Collection file is empty');
  }

  return { config, collectionConfigFile: store.root };
};
