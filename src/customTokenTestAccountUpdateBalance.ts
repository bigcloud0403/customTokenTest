import { createConnection, RowDataPacket, FieldPacket, OkPacket } from 'mysql2/promise';
import {
  method,
  Mina,
  AccountUpdate,
  SmartContract,
  PublicKey,
  TokenId,
  TokenContract,
  AccountUpdateForest,
  UInt64,
  Int64,
  DeployArgs,
  Permissions,
  TransactionVersion,
  PrivateKey,
  fetchAccount,
  Signature,
  state,
  State,
  Bool,
} from 'o1js';

export class Token extends TokenContract {
  async deploy(args?: DeployArgs) {
    await super.deploy(args);

    this.account.permissions.set({
      receive: Permissions.none(),
      send: Permissions.proof(),
      editState: Permissions.proof(),
      editActionState: Permissions.proof(),
      setDelegate: Permissions.proof(),
      setPermissions: Permissions.proof(),
      setVerificationKey: {
        auth: Permissions.proof(),
        txnVersion: TransactionVersion.current(),
      },
      setZkappUri: Permissions.proof(),
      setTokenSymbol: Permissions.proof(),
      incrementNonce: Permissions.proof(),
      setVotingFor: Permissions.proof(),
      setTiming: Permissions.proof(),
      access: Permissions.proof(),
    });

    this.account.tokenSymbol.set('MYTKN6');
  }

  @method
  async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }

  @method
  async mint(receiverAddress: PublicKey, amount: UInt64) {
    // Token ID를 커스텀 토큰 ID로 지정
    let customTokenId = this.deriveTokenId(); // this.tokenId는 MINA tokenId를 의미

    let accountUpdate = AccountUpdate.createSigned(this.self.publicKey, customTokenId);
    accountUpdate.body.balanceChange = Int64.from(amount);
    accountUpdate.body.publicKey = receiverAddress;
    accountUpdate.body.tokenId = customTokenId;
    accountUpdate.body.mayUseToken = { parentsOwnToken: Bool(true), inheritFromParent: Bool(false) };
  }

  @method
  async burn(holderAddress: PublicKey, amount: UInt64) {
    let customTokenId = this.deriveTokenId(); // this.tokenId는 MINA tokenId를 의미

    let accountUpdate = AccountUpdate.createSigned(this.self.publicKey, customTokenId);
    accountUpdate.body.balanceChange = Int64.from(amount).neg();
    accountUpdate.body.publicKey = holderAddress;
    accountUpdate.body.tokenId = customTokenId;
    accountUpdate.body.mayUseToken = { parentsOwnToken: Bool(true), inheritFromParent: Bool(false) };
  }

  @method
  async transfer(from: PublicKey, to: PublicKey, value: UInt64) {
    let customTokenId = this.deriveTokenId(); // this.tokenId는 MINA tokenId를 의미

    let fromAccountUpdate = AccountUpdate.createSigned(from, customTokenId);
    fromAccountUpdate.body.balanceChange = Int64.from(value).neg();
    fromAccountUpdate.body.publicKey = from;
    //fromAccountUpdate.body.incrementNonce = Bool(false);
    fromAccountUpdate.body.tokenId = customTokenId;
    fromAccountUpdate.body.mayUseToken = { parentsOwnToken: Bool(true), inheritFromParent: Bool(false) };

    let toAccountUpdate = AccountUpdate.createSigned(to, customTokenId);
    toAccountUpdate.body.balanceChange = Int64.from(value);
    toAccountUpdate.body.publicKey = to;
    //toAccountUpdate.body.incrementNonce = Bool(false);
    toAccountUpdate.body.tokenId = customTokenId;
    toAccountUpdate.body.mayUseToken = { parentsOwnToken: Bool(true), inheritFromParent: Bool(false) };
  }
}


  const endPoint = Mina.Network(
    'https://api.minascan.io/node/devnet/v1/graphql'
  );
  Mina.setActiveInstance(endPoint);

  
  let accountFee = Mina.getNetworkConstants().accountCreationFee;

  // Define the sender account
  //const tokenAccountKey = PrivateKey.random();
  const tokenAccountKey = PrivateKey.fromBase58('EKEG3tARbJs7yVWbvqphMVeUuy1kekc9ijZVRv1EjwbFEQKDLvk1');
  const tokenAccount = tokenAccountKey.toPublicKey();
  
  const senderKey = PrivateKey.fromBase58('EKE1EFZDRhLpmUgCArXiJgE5TTtvgLmtmkHiT38Gunakzdrb2iQU');
  const sender = senderKey.toPublicKey();

  const bAccountKey = PrivateKey.fromBase58('EKF46yf4CHXzNDfBeuPCmqJpL1vPicEkTy3BHpkHVRQZQ22cmUJN');
  const bAccount = bAccountKey.toPublicKey();

  const cAccountKey = PrivateKey.random();
  const cAccount = cAccountKey.toPublicKey();


  const faucetAccount = await fetchAccount({ publicKey: sender });

let faucetNonce = Number(faucetAccount.account?.nonce);
let faucetBalance = Number(faucetAccount.account?.balance);
console.log('faucetAccount:', JSON.stringify(faucetAccount));
console.log('faucetNonce:', faucetNonce);

const transactionFee = 100_000_000; // 0.1 MINA

const jobType = process.argv[2];

console.log('jobType:', jobType);

let tx;

// Start timer
let startTime = performance.now();
let endTime;
let duration;
let duration2;

await Token.compile();

let initialBalance = 100_000;
const token = new Token(tokenAccount);
const tokenId = token.deriveTokenId();

// End timer and calculate duration
endTime = performance.now();
duration = endTime - startTime; // Convert milliseconds to seconds
duration2 = (endTime - startTime) / 1000; // Convert milliseconds to seconds

console.log(`***** Token compile completed in ${duration} milliseconds *****`);
console.log(`***** Token compile completed in ${duration2} seconds *****`);

console.log('tokenAccountKey', tokenAccountKey.toBase58());
console.log('tokenAccount', tokenAccount.toBase58());
console.log('bAccountKey', bAccountKey.toBase58());
console.log('bAccount', bAccount.toBase58());
console.log('cAccountKey', cAccountKey.toBase58());
console.log('cAccount', cAccount.toBase58());
console.log('senderKey', senderKey.toBase58());
console.log('sender', sender.toBase58());

console.log('tokenId', TokenId.toBase58(tokenId));
console.log('-------------------------------------------');

if(Mina.hasAccount(sender)){
  console.log('has MINA account for tokenContractAccount');
  console.log('balance for tokenContractAccount', Mina.getBalance(sender).value.toBigInt());
} 

const deployToken = async () => {
  startTime = performance.now();

  console.log('###################### deploy tokenZkApp ######################');

  let memo = 'deploy tokenZkApp';
  tx = await Mina.transaction({sender:sender, fee: transactionFee, memo: memo, nonce: faucetNonce}, async () => {
      AccountUpdate.fundNewAccount(sender);
    await token.deploy();
  });
  const signedTx = await tx.sign([senderKey, tokenAccountKey]).send();

  endTime = performance.now();
  duration = endTime - startTime; // Convert milliseconds to seconds
  duration2 = (endTime - startTime) / 1000; // Convert milliseconds to seconds

  console.log(`***** deploy completed in ${duration} milliseconds *****`);
  console.log(`***** deploy completed in ${duration2} seconds *****`);

  console.log('\n*** hash:', signedTx.hash, '\n');

  if(Mina.hasAccount(tokenAccount)){
    console.log('has MINA account for tokenContractAccount');
    console.log('balance for tokenContractAccount', Mina.getBalance(tokenAccount).value.toBigInt());
  }
  if(Mina.hasAccount(tokenAccount, tokenId)){
    console.log('has token account for tokenContractAccount');
    console.log('balance for tokenContractAccount', Mina.getBalance(tokenAccount, tokenId).value.toBigInt());
  }
}

const mintToken = async () => {
  console.log('###################### mint ######################');

  console.log('mint token to zkAppB');
  startTime = performance.now();

  let isExistTokenAccount = 'N';

  try {
    let feePayerAccount1 = await fetchAccount({
      publicKey: bAccount,
      tokenId: tokenId
    });
    if(feePayerAccount1.account){
      isExistTokenAccount = 'Y';
    }
  } catch (error) {
    console.log('feePayerPublicKey2 not exist');
  }

  console.log('isExistTokenAccount:', isExistTokenAccount);
  let memo = 'mint token to zkAppB';
  tx = await Mina.transaction({sender:sender, fee: transactionFee, memo: memo, nonce: faucetNonce}, async () => {
  //tx = await Mina.transaction({sender:sender, fee: transactionFee, memo: memo}, async () => {
    if(isExistTokenAccount == 'N'){
      console.log('*** fundNewAccount');
      AccountUpdate.fundNewAccount(sender);
    } else {
      console.log('*** createSigned');
      AccountUpdate.createSigned(sender);
    }

    await token.mint(bAccount, UInt64.from(1_000_000_000_000_000));
  });
  await tx.prove();

  endTime = performance.now();
  duration = endTime - startTime; // Convert milliseconds to seconds
  duration2 = (endTime - startTime) / 1000; // Convert milliseconds to seconds

  console.log(`***** mint tx prove bAccount in ${duration} milliseconds *****`);
  console.log(`***** mint tx prove bAccount in ${duration2} seconds *****`);

  startTime = performance.now();

  let res = await tx.sign([senderKey, tokenAccountKey, bAccountKey]).send();

  console.log('\n*** hash:', res.hash, '\n');
  console.log('res:', res);
  //console.log('accountUpdates :', JSON.stringify(res.transaction.accountUpdates));

  endTime = performance.now();
  duration = endTime - startTime; // Convert milliseconds to seconds
  duration2 = (endTime - startTime) / 1000; // Convert milliseconds to seconds

  console.log(`***** mint tx send bAccount in ${duration} milliseconds *****`);
  console.log(`***** mint tx send bAccount in ${duration2} seconds *****`);
}

const sendToken = async () => {
  console.log('###################### send ######################');

  console.log('send token to zkAppC');
  startTime = performance.now();

  let isExistTokenAccount = 'N';

  try {
    let feePayerAccount1 = await fetchAccount({
      publicKey: cAccount,
      tokenId: tokenId
    });
    if(feePayerAccount1.account){
      isExistTokenAccount = 'Y';
    }
  } catch (error) {
    console.log('feePayerPublicKey2 not exist');
  }

  let memo = 'transfer token';
  tx = await Mina.transaction({sender:sender, fee: transactionFee, memo: memo, nonce: faucetNonce}, async () => {
    if(isExistTokenAccount == 'N'){
      console.log('*** fundNewAccount');
      AccountUpdate.fundNewAccount(sender);
    } else {
      console.log('*** createSigned');
      AccountUpdate.createSigned(sender);
    }

    await token.transfer(bAccount, cAccount, UInt64.from(1_000_000_000));
  });

  endTime = performance.now();
  duration = endTime - startTime; // Convert milliseconds to seconds
  duration2 = (endTime - startTime) / 1000; // Convert milliseconds to seconds

  console.log(`***** transfer token tx make in ${duration} milliseconds *****`);
  console.log(`***** transfer token tx make in ${duration2} seconds *****`);

  startTime = performance.now();
  console.log('start prove');
  await tx.prove(); 

  let res = await tx.sign([senderKey, bAccountKey, cAccountKey, tokenAccountKey]).send();

  console.log('\n*** hash:', res.hash, '\n');

  endTime = performance.now();
  duration = endTime - startTime; // Convert milliseconds to seconds
  duration2 = (endTime - startTime) / 1000; // Convert milliseconds to seconds

  console.log(`***** transfer token tx prove in ${duration} milliseconds *****`);
  console.log(`***** transfer token tx prove in ${duration2} seconds *****`);

  faucetNonce++;
}

switch (jobType) {
  case 'deploy':
    deployToken();
    break;
  case 'mint':
    mintToken();
    break;
  case 'send':
    sendToken();
    break;
}


console.log('------------------- complete job ------------------------');