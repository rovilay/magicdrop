import {
  createPublicClient,
  Hex,
  http,
  PublicClient,
  Chain,
  TransactionReceipt,
  decodeEventLog,
  toEventSelector,
  encodeFunctionData,
  decodeFunctionResult,
  formatEther,
} from 'viem';
import {
  getSymbolFromChainId,
  getTransferValidatorAddress,
  getTransferValidatorListId,
  getViemChainByChainId,
} from './getters';
import {
  ICREATOR_TOKEN_INTERFACE_ID,
  rpcUrls,
  SUPPORTED_CHAINS,
} from './constants';
import { collapseAddress, isValidEthereumAddress } from './common';
import {
  APPLY_LIST_TO_COLLECTION_ABI,
  IS_SETUP_LOCKED_ABI,
  MagicDropCloneFactoryAbis,
  MagicDropTokenImplRegistryAbis,
  NEW_CONTRACT_INITIALIZED_EVENT_ABI,
  SET_TRANSFER_VALIDATOR_ABI,
  SET_TRANSFERABLE_ABI,
  SUPPORTS_INTERFACE_ABI,
} from '../abis';
import { printTransactionHash, showText } from './display';
import { getMETurnkeyServiceClient } from './turnkey';

export class ContractManager {
  public client: PublicClient;
  public rpcUrl: string;
  public chain: Chain;

  constructor(
    public chainId: SUPPORTED_CHAINS,
    public signer: Hex,
    public symbol: string,
  ) {
    this.symbol = this.symbol.toLowerCase();
    this.rpcUrl = rpcUrls[this.chainId];
    this.chain = getViemChainByChainId(this.chainId);

    // Initialize viem client
    this.client = createPublicClient({
      chain: getViemChainByChainId(this.chainId),
      transport: http(this.rpcUrl),
    }) as PublicClient;

    if (!this.signer && !isValidEthereumAddress(this.signer)) {
      throw new Error(
        'ContractManager initialization failed! Signer is invalid.',
      );
    }

    this.signer = signer;
  }

  public async getDeploymentFee(
    registryAddress: Hex,
    standardId: number,
    implId: number,
  ): Promise<bigint> {
    try {
      const data = encodeFunctionData({
        abi: [MagicDropTokenImplRegistryAbis.getDeploymentFee],
        functionName: MagicDropTokenImplRegistryAbis.getDeploymentFee.name,
        args: [standardId, implId],
      });

      const result = await this.client.call({
        to: registryAddress,
        data,
      });

      showText('Fetching deployment fee...', '', false, false);

      if (!result.data) return BigInt(0);

      const decodedResult = decodeFunctionResult({
        abi: [MagicDropTokenImplRegistryAbis.getDeploymentFee],
        functionName: MagicDropTokenImplRegistryAbis.getDeploymentFee.name,
        data: result.data,
      });

      return decodedResult;
    } catch (error: any) {
      console.error('Error fetching deployment fee:', error.message);
      throw new Error('Failed to fetch deployment fee.');
    }
  }

  /**
   * Sends a transaction using METurnkeyServiceClient for signing.
   */
  public async sendTransaction({
    to,
    data,
    value = BigInt(0),
    gasLimit = BigInt(3_000_000),
  }: {
    to: Hex;
    data: Hex;
    value?: bigint;
    gasLimit?: bigint;
  }): Promise<Hex> {
    const meTurnkeyServiceClient = await getMETurnkeyServiceClient();
    return await meTurnkeyServiceClient.sendTransaction(this.symbol, {
      to,
      data,
      value,
      gasLimit,
      chainId: this.chainId,
    });
  }

  public async waitForTransactionReceipt(txHash: Hex) {
    return await this.client.waitForTransactionReceipt({ hash: txHash });
  }

  /**
   * returns the native balance of the signer
   * @returns The native balance of the signer in a human-readable format (e.g., ETH, MATIC).
   * @throws Error if the balance retrieval fails.
   */
  public async getSignerNativeBalance(): Promise<string> {
    try {
      // Fetch the balance of the signer
      const balance = await this.client.getBalance({
        address: this.signer,
      });

      // Convert the balance from Wei to Ether
      const humanReadableBalance = formatEther(balance);

      return humanReadableBalance;
    } catch (error: any) {
      console.error('Error checking signer native balance:', error.message);
      throw new Error('Failed to fetch signer native balance.');
    }
  }

  public async printSignerWithBalance() {
    if (!this.rpcUrl || !this.signer) {
      throw new Error('rpcUrl or signer is not set.');
    }

    const balance = await this.getSignerNativeBalance();
    const symbol = getSymbolFromChainId(this.chainId);

    console.log(`Signer: ${collapseAddress(this.signer)}`);
    console.log(`Balance: ${balance} ${symbol}`);
  }

  /**
   * Transfers native currency (ETH, MATIC, etc.) to a recipient address
   * @param to The recipient address
   * @param amount The amount to transfer in wei
   * @returns Transaction hash
   */
  public async transferNative({
    to,
    amount,
    gasLimit,
  }: {
    to: Hex;
    amount: bigint;
    gasLimit?: bigint;
  }): Promise<Hex> {
    const symbol = getSymbolFromChainId(this.chainId);
    showText(
      `Transferring ${formatEther(amount)} ${symbol} to ${collapseAddress(to)}...`,
    );

    // Check if sender has enough balance
    const balance = await this.client.getBalance({
      address: this.signer,
    });

    if (balance < amount) {
      throw new Error(
        `Insufficient balance. Available: ${formatEther(balance)} ${symbol}, Required: ${formatEther(amount)} ${symbol}`,
      );
    }

    const txHash = await this.sendTransaction({
      to,
      data: '0x',
      value: amount,
      gasLimit,
    });

    return txHash;
  }

  static getContractAddressFromLogs(logs: TransactionReceipt['logs']) {
    try {
      // Generate the event selector from the event ABI
      const eventSelector = toEventSelector(
        NEW_CONTRACT_INITIALIZED_EVENT_ABI,
      ) as Hex;

      // Find the log that matches the event signature
      const log = logs.find((log) =>
        (log.topics as Hex[]).includes(eventSelector),
      );

      if (!log) {
        throw new Error(
          'No matching log found for NewContractInitialized event.',
        );
      }

      // Decode the event log
      const decodedLog = decodeEventLog({
        abi: [NEW_CONTRACT_INITIALIZED_EVENT_ABI],
        data: log.data,
        topics: log.topics,
      });

      // Extract the contract address
      const contractAddress = (decodedLog.args as any).contractAddress;

      if (!contractAddress) {
        throw new Error('Contract address not found in decoded log.');
      }

      return contractAddress as Hex;
    } catch (error: any) {
      console.error(
        'Error decoding contract address from logs:',
        error.message,
      );
      throw new Error('Failed to extract contract address from logs.');
    }
  }

  /**
   * Checks if the contract supports the ICreatorToken interface.
   * @param contractAddress The address of the contract to check.
   * @returns A boolean indicating whether the contract supports ICreatorToken.
   */
  public async supportsICreatorToken(contractAddress: Hex): Promise<boolean> {
    try {
      console.log('Checking if contract supports ICreatorToken...');

      // Encode the function call for `supportsInterface(bytes4)`
      const data = encodeFunctionData({
        abi: [SUPPORTS_INTERFACE_ABI],
        functionName: SUPPORTS_INTERFACE_ABI.name,
        args: [ICREATOR_TOKEN_INTERFACE_ID],
      });

      // Call the contract using viem's `call` method
      const result = await this.client.call({
        to: contractAddress,
        data,
      });

      // Decode the result
      const decodedResult = decodeFunctionResult({
        abi: [SUPPORTS_INTERFACE_ABI],
        functionName: SUPPORTS_INTERFACE_ABI.name,
        data: result.data ?? '0x',
      }) as boolean;

      // Return the result as a boolean
      return decodedResult;
    } catch (error: any) {
      console.error('Error checking ICreatorToken support:', error.message);
      return false;
    }
  }

  public async createContract({
    collectionName,
    collectionSymbol,
    standardId,
    factoryAddress,
    implId,
    deploymentFee = BigInt(0),
  }: {
    collectionName: string;
    collectionSymbol: string;
    standardId: number;
    factoryAddress: Hex;
    implId: number;
    deploymentFee?: bigint;
  }) {
    // Implementation of createContract method
    const data = encodeFunctionData({
      abi: [MagicDropCloneFactoryAbis.createContract],
      functionName: MagicDropCloneFactoryAbis.createContract.name,
      args: [collectionName, collectionSymbol, standardId, this.signer, implId],
    });

    // Sign and send transaction
    const txHash = await this.sendTransaction({
      to: factoryAddress,
      data,
      value: deploymentFee,
    });

    const receipt = await this.waitForTransactionReceipt(txHash);

    return receipt;
  }

  /**
   * Sets the transfer validator for a contract.
   * @param contractAddress The address of the contract.
   * @throws Error if the operation fails.
   */
  public async setTransferValidator(contractAddress: Hex): Promise<Hex> {
    try {
      // Get the transfer validator address for the given chain ID
      const tfAddress = getTransferValidatorAddress(this.chainId);
      console.log(`Setting transfer validator to ${tfAddress}...`);

      const data = encodeFunctionData({
        abi: [SET_TRANSFER_VALIDATOR_ABI],
        functionName: SET_TRANSFER_VALIDATOR_ABI.name,
        args: [tfAddress],
      });

      const txHash = await this.sendTransaction({
        to: contractAddress,
        data,
      });

      printTransactionHash(txHash, this.chainId);

      console.log('Transfer validator set.');
      console.log('');

      return txHash;
    } catch (error: any) {
      console.error('Error setting transfer validator:', error.message);
      throw new Error('Failed to set transfer validator.');
    }
  }

  /**
   * Sets the transfer list for a contract.
   * @param contractAddress The address of the contract.
   * @throws Error if the operation fails.
   */
  public async setTransferList(contractAddress: Hex): Promise<Hex> {
    try {
      // Get the transfer validator list ID for the given chain ID
      const tfListId = getTransferValidatorListId(this.chainId);
      console.log(`Setting transfer list to list ID ${tfListId}...`);

      // Get the transfer validator address
      const tfAddress = getTransferValidatorAddress(this.chainId) as Hex;

      const data = encodeFunctionData({
        abi: [APPLY_LIST_TO_COLLECTION_ABI],
        functionName: APPLY_LIST_TO_COLLECTION_ABI.name,
        args: [contractAddress, BigInt(tfListId)],
      });

      const txHash = await this.sendTransaction({
        to: tfAddress,
        data,
      });

      printTransactionHash(txHash, this.chainId);

      console.log('Transfer list set.');
      console.log('');

      return txHash;
    } catch (error: any) {
      console.error('Error setting transfer list:', error.message);
      throw new Error('Failed to set transfer list.');
    }
  }

  /**
   * Freeze a contract.
   * @param contractAddress The address of the contract.
   */
  public async freezeThawContract(
    contractAddress: Hex,
    freeze: boolean,
  ): Promise<Hex> {
    console.log(
      `${freeze ? 'Freezing' : 'Thawing'} contract... this will take a moment.`,
    );

    const data = encodeFunctionData({
      abi: [SET_TRANSFERABLE_ABI],
      functionName: SET_TRANSFERABLE_ABI.name,
      args: [!freeze],
    });

    const txHash = await this.sendTransaction({
      to: contractAddress,
      data,
    });

    return txHash;
  }

  /**
   * Checks if the contract setup is locked.
   * @param contractAddress The address of the contract.
   * @throws Error if the contract setup is locked.
   */
  public async checkSetupLocked(contractAddress: Hex): Promise<void> {
    try {
      console.log('Checking if contract setup is locked...');

      const data = encodeFunctionData({
        abi: [IS_SETUP_LOCKED_ABI],
        functionName: IS_SETUP_LOCKED_ABI.name,
        args: [],
      });

      const result = await this.client.call({
        to: contractAddress,
        data,
      });

      const setupLocked = decodeFunctionResult({
        abi: [IS_SETUP_LOCKED_ABI],
        functionName: IS_SETUP_LOCKED_ABI.name,
        data: result.data ?? '0x',
      });

      // Check if the result indicates the setup is locked
      if (setupLocked) {
        showText(
          'This contract has already been setup. Please use other commands from the "Manage Contracts" menu to update the contract.',
        );
        process.exit(1);
      } else {
        console.log('Contract setup is not locked. Proceeding...');
      }
    } catch (error: any) {
      console.error('Error checking setup lock:', error.message);
      throw error;
    }
  }
}
