import path from 'path';
import fs from 'fs';
import { confirm } from '@inquirer/prompts';
import { collapseAddress, executeCommand, saveDeploymentData } from './common';
import {
  confirmDeployment,
  confirmSetup,
  printTransactionHash,
  showText,
} from './display';
import {
  DeployContractConfig,
  ERC1155StageData,
  ERC721StageData,
} from './types';
import {
  getBaseDir,
  getExplorerContractUrl,
  getFactoryAddress,
  getImplId,
  getRegistryAddress,
  getStandardId,
  getUseERC721C,
  promptForConfirmation,
} from './getters';
import { ContractManager } from './ContractManager';
import { Hex } from 'viem';
import {
  DEFAULT_MINT_CURRENCY,
  SUPPORTED_CHAINS,
  TOKEN_STANDARD,
} from './constants';
import { AbiFunction } from 'ox';
import {
  set1155Uri,
  setBaseUri,
  setFundReceiver,
  setGlobalWalletLimit,
  setMaxMintableSupply,
  setMintCurrency,
  setNumberOf1155Tokens,
  setRoyalties,
  setStagesFile,
  setTokenUriSuffix,
} from './setters';

export const deployContract = async ({
  collectionConfigFile,
  tokenStandard,
  stages,
  name: collectionName,
  symbol: collectionSymbol,
  maxMintableSupply,
  royaltyFee,
  royaltyReceiver,
  globalWalletLimit,
  fundReceiver,
  setupContractOption,
  uri,
  tokenUriSuffix,
  mintCurrency,
  contractManager: cm,
  totalTokens,
}: DeployContractConfig) => {
  showText('Deploying a new collection...');

  await cm.printSignerWithBalance();

  const factoryAddress = getFactoryAddress(cm.chainId);
  const registryAddress = getRegistryAddress(cm.chainId);
  const standardId = getStandardId(tokenStandard);
  const useERC721C = getUseERC721C();
  const implId = getImplId(cm.chainId, tokenStandard, useERC721C);

  showText('Fetching deployment fee...', '', false, false);

  const deploymentFee = await cm.getDeploymentFee(
    registryAddress,
    Number(standardId),
    Number(implId),
  );

  await confirmDeployment({
    name: collectionName,
    symbol: collectionSymbol,
    tokenStandard,
    initialOwner: collapseAddress(cm.signer),
    implId: implId.toString(),
    chainId: cm.chainId,
    deploymentFee: deploymentFee.toString(),
  });

  showText('Deploying contract... this may take a minute.', '', false, false);

  const receipt = await cm.createContract({
    collectionName,
    collectionSymbol,
    factoryAddress,
    standardId: Number(standardId),
    implId: Number(implId),
    deploymentFee,
  });

  if (!receipt.transactionHash) {
    throw new Error('Transaction hash not found in transaction receipt.');
  }

  printTransactionHash(receipt.transactionHash, cm.chainId);

  // Extract the contract address
  const contractAddress = ContractManager.getContractAddressFromLogs(
    receipt.logs,
  );
  showText(`Deployed Contract Address: ${contractAddress}`, '', false, false);
  showText(
    getExplorerContractUrl(cm.chainId, contractAddress),
    '',
    false,
    false,
  );

  saveDeploymentData(contractAddress, cm.signer, collectionConfigFile);

  const isICreatorToken = await cm.supportsICreatorToken(contractAddress);

  if (isICreatorToken) {
    console.log(
      'Contract supports ICreatorToken, updating transfer validator and transfer list...',
    );

    await cm.setTransferValidator(contractAddress);
    await cm.setTransferList(contractAddress);

    const freezeCollection = await confirm({
      message: 'Would you like to freeze the collection?',
      default: true,
    });

    if (freezeCollection) {
      cm.freezeContract(contractAddress);
    }
  }

  const setupNow =
    setupContractOption === 'yes' ||
    (setupContractOption === 'deferred' &&
      (await promptForConfirmation('Would you like to setup the contract?')));

  if (setupNow) {
    await setupContract({
      cm,
      contractAddress,
      chainId: cm.chainId,
      tokenStandard,
      collectionFile: collectionConfigFile,
      signer: cm.signer,
      baseDir: getBaseDir(),
      uri,
      tokenUriSuffix,
      stagesJson: JSON.stringify(stages),
      globalWalletLimit,
      maxMintableSupply,
      fundReceiver,
      royaltyReceiver,
      royaltyFee,
      mintCurrency,
      totalTokens,
    });
  }
};

const sendERC721SetupTransaction = async ({
  cm,
  contractAddress,
  tokenUriSuffix,
  uri,
  maxMintableSupply,
  globalWalletLimit,
  mintCurrency,
  fundReceiver,
  stagesData,
  royaltyReceiver,
  royaltyFee,
}: {
  cm: ContractManager;
  contractAddress: Hex;
  tokenUriSuffix: string;
  uri: string;
  maxMintableSupply: number;
  globalWalletLimit: number;
  mintCurrency: string;
  fundReceiver: string;
  stagesData: ERC721StageData[];
  royaltyReceiver: string;
  royaltyFee: number;
}) => {
  try {
    const setupSignature =
      'function setup(string,string,uint256,uint256,address,address,(uint80,uint80,uint32,bytes32,uint24,uint256,uint256)[],address,uint96)';

    const abi = AbiFunction.from(setupSignature);

    const parsedStagesData = stagesData.map((stage) => {
      return [
        BigInt(stage.price),
        BigInt(stage.mintFee),
        stage.walletLimit,
        stage.merkleRoot as Hex,
        stage.maxStageSupply,
        BigInt(stage.startTime),
        BigInt(stage.endTime),
      ] as readonly [bigint, bigint, number, Hex, number, bigint, bigint];
    });

    const encodedData = AbiFunction.encodeData(abi, [
      uri as string,
      tokenUriSuffix as string,
      BigInt(maxMintableSupply as number),
      BigInt(globalWalletLimit as number),
      mintCurrency as Hex,
      fundReceiver as Hex,
      parsedStagesData,
      royaltyReceiver as Hex,
      BigInt(royaltyFee),
    ]);

    const hash = await cm.sendTransaction({
      to: contractAddress,
      data: encodedData,
    });

    const receipt = await cm.waitForTransactionReceipt(hash);

    return receipt.transactionHash;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
};

/**
 * Sets up an existing collection contract.
 * @param params
 * @throws Error if the operation fails.
 */
const setupContract = async (params: {
  cm: ContractManager;
  contractAddress: Hex;
  chainId: SUPPORTED_CHAINS;
  tokenStandard: TOKEN_STANDARD;
  collectionFile: string;
  signer: string;
  baseDir?: string;
  uri?: string;
  tokenUriSuffix?: string;
  title?: string;
  stagesJson?: string;
  totalTokens?: number;
  globalWalletLimit?: number | number[];
  maxMintableSupply?: number | number[];
  fundReceiver?: string;
  royaltyReceiver?: string;
  royaltyFee?: number;
  mintCurrency: string;
}): Promise<void> => {
  const {
    cm,
    contractAddress,
    chainId,
    tokenStandard,
    collectionFile,
    signer,
    stagesJson,
    title = 'Setup an existing collection',
    baseDir = __dirname,
  } = params;

  try {
    console.clear();

    await cm.checkSetupLocked(contractAddress);

    const stagesFile = !stagesJson ? await setStagesFile() : undefined;

    // Define setup selector based on token standard
    let uri = '';
    let tokenUriSuffix = '';
    let totalTokens = 0;

    if (tokenStandard === TOKEN_STANDARD.ERC721) {
      uri = params.uri ?? (await setBaseUri(title));
      tokenUriSuffix =
        params.tokenUriSuffix ?? (await setTokenUriSuffix(title));
    } else if (tokenStandard === TOKEN_STANDARD.ERC1155) {
      totalTokens = params.totalTokens ?? (await setNumberOf1155Tokens(title));
      uri = params.uri ?? (await set1155Uri(title));
    } else {
      throw new Error('Unknown token standard');
    }

    const globalWalletLimit =
      params.globalWalletLimit ??
      (await setGlobalWalletLimit(tokenStandard, totalTokens, title));
    const maxMintableSupply =
      params.maxMintableSupply ??
      (await setMaxMintableSupply(tokenStandard, totalTokens, title));
    const mintCurrency =
      params.mintCurrency ||
      (await setMintCurrency(title, DEFAULT_MINT_CURRENCY));
    const fundReceiver =
      params.fundReceiver ?? (await setFundReceiver(title, signer));
    const { royaltyFee, royaltyReceiver } =
      params.royaltyFee === undefined || !params.royaltyReceiver
        ? await setRoyalties(title)
        : {
            royaltyFee: params.royaltyFee,
            royaltyReceiver: params.royaltyReceiver,
          };

    await cm.printSignerWithBalance();
    await confirmSetup({
      chainId,
      tokenStandard,
      contractAddress,
      maxMintableSupply,
      globalWalletLimit,
      mintCurrency,
      royaltyReceiver,
      royaltyFee,
      stagesFile,
      stagesJson,
      fundReceiver,
    });

    // Process stages file
    console.log('Processing stages file... this will take a moment.');
    const stagesData = await processStages({
      collectionFile,
      stagesFile,
      stagesJson,
      tokenStandard,
      baseDir,
    });

    console.log('Setting up contract... this will take a moment.');
    if (tokenStandard === TOKEN_STANDARD.ERC721) {
      await sendERC721SetupTransaction({
        cm: params.cm,
        contractAddress,
        uri,
        tokenUriSuffix,
        maxMintableSupply: maxMintableSupply as number,
        globalWalletLimit: globalWalletLimit as number,
        mintCurrency,
        fundReceiver,
        stagesData: stagesData as ERC721StageData[],
        royaltyReceiver,
        royaltyFee,
      });
    } else {
      await sendERC1155SetupTransaction({
        cm: params.cm,
        contractAddress,
        uri,
        maxMintableSupply: maxMintableSupply as number[],
        globalWalletLimit: globalWalletLimit as number[],
        mintCurrency,
        fundReceiver,
        stagesData: stagesData as ERC1155StageData[],
        royaltyReceiver,
        royaltyFee,
      });
    }

    console.log('Contract setup completed.');
  } catch (error: any) {
    console.error('Error setting up contract:', error.message);
    throw new Error('Failed to set up contract.');
  }
};

/**
 * Processes the stages file and generates the required output.
 * @param params An object containing the required parameters for processing stages.
 * @returns the stageData
 * @throws Error if the process fails or the output file is not found.
 */
export const processStages = async (params: {
  collectionFile: string;
  stagesFile?: string;
  stagesJson?: string;
  tokenStandard: string;
  baseDir: string;
}): Promise<ERC721StageData[] | ERC1155StageData[]> => {
  const {
    collectionFile,
    stagesFile = '',
    stagesJson,
    tokenStandard,
    baseDir,
  } = params;

  const outputFileDir = path.dirname(collectionFile);
  console.log(`Output file directory: ${outputFileDir}`);
  const saveToJson = true;

  try {
    // Execute the script to process stages
    executeCommand(
      `npx ts-node "${path.join(
        baseDir,
        '../../scripts/utils/getStagesData.ts',
      )}" "${stagesFile}" '${stagesJson}' "${outputFileDir}" "${tokenStandard}" "" "${saveToJson}"`,
    );
  } catch (error: any) {
    console.error(
      'Error: Failed to get stages data',
      error.message,
      error.reason,
    );
    throw new Error('Failed to get stages data');
  }

  // Check if the output file exists
  const outputFilePath = path.join(outputFileDir, 'stagesInput.tmp.json');

  if (!fs.existsSync(outputFilePath)) {
    console.error(`Error: Output file not found: ${outputFilePath}`);
    throw new Error(`Output file not found: ${outputFilePath}`);
  }

  // Read the stages data
  const stagesData = fs.readFileSync(outputFilePath, 'utf-8');

  // Delete the temporary file
  fs.unlinkSync(outputFilePath);

  return JSON.parse(stagesData);
};

const sendERC1155SetupTransaction = async ({
  cm,
  contractAddress,
  uri,
  maxMintableSupply,
  globalWalletLimit,
  mintCurrency,
  fundReceiver,
  stagesData,
  royaltyReceiver,
  royaltyFee,
}: {
  cm: ContractManager;
  contractAddress: Hex;
  uri: string;
  maxMintableSupply: number[];
  globalWalletLimit: number[];
  mintCurrency: string;
  fundReceiver: string;
  stagesData: ERC1155StageData[];
  royaltyReceiver: string;
  royaltyFee: number;
}) => {
  try {
    const setupSignature =
      'function setup(string,uint256[],uint256[],address,address,(uint80[],uint80[],uint32[],bytes32[],uint24[],uint256,uint256)[],address,uint96)';

    const abi = AbiFunction.from(setupSignature);

    const parsedStagesData = stagesData.map((stage) => {
      return [
        stage.price.map((price) => BigInt(price)),
        stage.mintFee.map((fee) => BigInt(fee)),
        stage.walletLimit,
        stage.merkleRoot,
        stage.maxStageSupply,
        BigInt(stage.startTime),
        BigInt(stage.endTime),
      ] as readonly [
        bigint[],
        bigint[],
        number[],
        Hex[],
        number[],
        bigint,
        bigint,
      ];
    });

    const encodedData = AbiFunction.encodeData(abi, [
      uri as string,
      maxMintableSupply.map((supply) => BigInt(supply)),
      globalWalletLimit.map((limit) => BigInt(limit)),
      mintCurrency as Hex,
      fundReceiver as Hex,
      parsedStagesData,
      royaltyReceiver as Hex,
      BigInt(royaltyFee),
    ]);

    const hash = await cm.sendTransaction({
      to: contractAddress,
      data: encodedData,
    });

    const receipt = await cm.waitForTransactionReceipt(hash);

    return receipt.transactionHash;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
};
