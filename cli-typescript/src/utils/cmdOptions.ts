import { Option } from 'commander';
import {
  COLLECTION_DIR,
  SUPPORTED_CHAINS,
  supportedChainNames,
  TOKEN_STANDARD,
} from './constants';

export const getEnvOption = (
  choices?: string[],
  description?: string,
  defaultEnv?: string,
) => {
  const opt = new Option(
    '-e --env <env>',
    description ?? 'Environment to deploy to (e.g., mainnet, testnet)',
  );

  if (choices) {
    opt.choices(choices);
  }

  return defaultEnv ? opt.default(defaultEnv) : opt;
};

export const tokenStandardOption = new Option(
  '-t --tokenStandard <tokenStandard>',
  'the contract type',
)
  .choices([TOKEN_STANDARD.ERC721, TOKEN_STANDARD.ERC1155])
  .default(TOKEN_STANDARD.ERC721);

export const chainOption = new Option(
  '-c --chain <chain>',
  'Specify the chain to deploy to;',
)
  .choices(Array.from(Object.values(supportedChainNames)))
  .default(supportedChainNames[SUPPORTED_CHAINS.MONAD_TESTNET]);

export const totalTokensOption = new Option(
  '--totalTokens <totalTokens>',
  `
    Total number of tokens in the collection. This value is used to calculate the minting stages.
    It is only used for ERC1155 tokenStandard.
    If you are using ERC721, this value is ignored.
    Notice: This value should match the number of tokens in the stages file. Otherwise, the contract will revert.
  `,
);

export const setupSignerOption = new Option(
  '-s --setupSigner',
  `
    Specify if a new signer account should be setup for the collection.
    Note: if you decide to ignore setup, you will need to setup the signer account manually.
    You can do this by creating a wallet.json file in the ${COLLECTION_DIR}/projects/<collection> directory.
  `,
);

export const walletIdOption = new Option(
  '-w --walletId <walletId>',
  `
    Specify the wallet to use for the collection. You can get the wallet id from the Turnkey dashboard.
    You can also specify the wallet in the .env file as TURNKEY_WALLET_ID.
    Note: this option is only used if the setupSigner option is set to 'yes'.
  `,
);
export const setupContractOption = new Option(
  '-s --setupContract <setupContract>',
  'Specify if the contract should be set up after deployment (yes, no, deferred)',
)
  .choices(['yes', 'no', 'deferred'])
  .default('deferred');
