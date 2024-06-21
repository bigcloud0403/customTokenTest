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
        
    
        this.account.tokenSymbol.set('MYTKN');
    }
    
    @method
    async approveBase(forest: AccountUpdateForest) {
      this.checkZeroBalanceChange(forest);
    }
  
    @method async mint(receiverAddress: PublicKey, amount: UInt64) {
      this.internal.mint({ address: receiverAddress, amount });
    }
  
    @method async burn(receiverAddress: PublicKey, amount: UInt64) {
      this.internal.burn({ address: receiverAddress, amount });
    }

    @method async transfer(from: PublicKey, to: PublicKey, value: UInt64) {
      this.internal.send({ from, to, amount: value });
    }
  }

  const endPoint = Mina.Network(
    'https://api.minascan.io/node/devnet/v1/graphql'
  );
  Mina.setActiveInstance(endPoint);

  let accountFee = Mina.getNetworkConstants().accountCreationFee;

  // Define the sender account
  //const tokenAccountKey = PrivateKey.random();
  const tokenAccountKey = PrivateKey.fromBase58('EKF5BnxorfQcE35iRtJZDg9Fqf8v28bXCnC3uCg3295rnvV33YzU');
  const tokenAccount = tokenAccountKey.toPublicKey();
  
  const senderKey = PrivateKey.fromBase58('EKDnCVGpFuNpY793XrS9JSuhHW3jLfFC38xmP2uL8zRNUD2HdRBF');
  const sender = senderKey.toPublicKey();

  const bAccountKey = PrivateKey.fromBase58('EKF46yf4CHXzNDfBeuPCmqJpL1vPicEkTy3BHpkHVRQZQ22cmUJN');
  const bAccount = bAccountKey.toPublicKey();

  const cAccountKey = PrivateKey.random();
  const cAccount = cAccountKey.toPublicKey();

  const faucetAccount = await fetchAccount({ publicKey: sender });

  const faucetNonce = Number(faucetAccount.account?.nonce);
  const faucetBalance = Number(faucetAccount.account?.balance);
  console.log('faucetAccount:', JSON.stringify(faucetAccount));

  const transactionFee = 10_000_000; // 0.01 MINA

  const jobType = process.argv[2];

  console.log('jobType:', jobType);

  //---------------------------
  // token 관련 선언

  let initialBalance = 100_000;
  
  let tx;
  
  // Start timer
  let startTime = performance.now();
  
  await Token.compile();

  // End timer and calculate duration
  let endTime = performance.now();
  let duration = endTime - startTime; // Convert milliseconds to seconds
  let duration2 = (endTime - startTime) / 1000; // Convert milliseconds to seconds

  console.log(`***** Token compile completed in ${duration} milliseconds *****`);
  console.log(`***** Token compile completed in ${duration2} seconds *****`);

  if(Mina.hasAccount(sender)){
    console.log('has MINA account for tokenContractAccount');
    console.log('balance for tokenContractAccount', Mina.getBalance(sender).value.toBigInt());
  }  

  let token = new Token(tokenAccount);
  let tokenId = token.deriveTokenId();

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

  const tokenDeploy = async () => {
    startTime = performance.now();

    console.log('###################### deploy tokenZkApp ######################');

    let memo = 'deploy tokenZkApp';
    tx = await Mina.transaction({sender:sender, fee: transactionFee, memo: memo, nonce: faucetNonce}, async () => {
        AccountUpdate.fundNewAccount(sender);
      await token.deploy();
      /*
      AccountUpdate.fundNewAccount(sender).send({
        to: token.self,
        amount: initialBalance,
      });
      */
    });
    await tx.sign([senderKey, tokenAccountKey]).send();

    endTime = performance.now();
    duration = endTime - startTime; // Convert milliseconds to seconds
    duration2 = (endTime - startTime) / 1000; // Convert milliseconds to seconds

    console.log(`***** deploy completed in ${duration} milliseconds *****`);
    console.log(`***** deploy completed in ${duration2} seconds *****`);
    
    if(Mina.hasAccount(tokenAccount)){
      console.log('has MINA account for tokenContractAccount');
      console.log('balance for tokenContractAccount', Mina.getBalance(tokenAccount).value.toBigInt());
    }
    if(Mina.hasAccount(tokenAccount, tokenId)){
      console.log('has token account for tokenContractAccount');
      console.log('balance for tokenContractAccount', Mina.getBalance(tokenAccount, tokenId).value.toBigInt());
    }
  }

  const tokenMint = async () => {
    console.log('###################### mint ######################');

    console.log('mint token to zkAppB');
    startTime = performance.now();

    let isExistTokenAccount = 'N';
    let accountUpdate;

    try {
      let feePayerAccount1 = await fetchAccount({
        publicKey: bAccount,
        tokenId: tokenId
      });
      isExistTokenAccount = 'Y';
    } catch (error) {
      console.log('feePayerPublicKey2 not exist');
    }

    let memo = 'mint token to zkAppB';
    tx = await Mina.transaction({sender:sender, fee: transactionFee, memo: memo, nonce: faucetNonce}, async () => {
      if(isExistTokenAccount == 'N'){
        console.log('*** fundNewAccount');
        //AccountUpdate.fundNewAccount(sender);
      } else {
          console.log('*** createSigned');
        //AccountUpdate.createSigned(sender);
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

    let res = await tx.sign([senderKey]).send();

    //console.log('res:', JSON.stringify(res));
    console.log('\n*** hash:', res.hash, '\n');

    endTime = performance.now();
    duration = endTime - startTime; // Convert milliseconds to seconds
    duration2 = (endTime - startTime) / 1000; // Convert milliseconds to seconds

    console.log(`***** mint tx send bAccount in ${duration} milliseconds *****`);
    console.log(`***** mint tx send bAccount in ${duration2} seconds *****`);
  }

  const tokenSend = async () => {
    console.log('###################### mint ######################');

    console.log('mint token to zkAppB');
    startTime = performance.now();

    let isExistTokenAccount = 'N';
    let accountUpdate;
    try {
      let feePayerAccount1 = await fetchAccount({
        publicKey: cAccount,
        tokenId: tokenId
      });
      if(feePayerAccount1) {
        isExistTokenAccount = 'Y';
      }
    } catch (error) {
      console.log('feePayerPublicKey2 not exist');
    }
    let memo = 'transfer token';
    
    tx = await Mina.transaction({sender:sender, fee: transactionFee, memo: memo, nonce: faucetNonce}, async () => {
      if(isExistTokenAccount == 'N'){
        console.log('*** fundNewAccount');
        accountUpdate = AccountUpdate.fundNewAccount(sender);
      } else {
        console.log('*** createSigned');
        accountUpdate = AccountUpdate.createSigned(sender);
      }
      
      await token.transfer(bAccount, cAccount, UInt64.from(1_000_000_000));
    });
    endTime = performance.now();
    duration = endTime - startTime; // Convert milliseconds to seconds
    duration2 = (endTime - startTime) / 1000; // Convert milliseconds to seconds

    console.log(`***** transfer token define tx in ${duration} milliseconds *****`);
    console.log(`***** transfer token define tx in ${duration2} seconds *****`);
    
    startTime = performance.now();

    await tx.prove();
    
    endTime = performance.now();
    duration = endTime - startTime; // Convert milliseconds to seconds
    duration2 = (endTime - startTime) / 1000; // Convert milliseconds to seconds

    console.log(`***** transfer token tx prove in ${duration} milliseconds *****`);
    console.log(`***** transfer token tx prove in ${duration2} seconds *****`);

    startTime = performance.now();

    let res = await tx.sign([senderKey, bAccountKey]).send();

    console.log('\n*** hash:', res.hash, '\n');

    endTime = performance.now();
    duration = endTime - startTime; // Convert milliseconds to seconds
    duration2 = (endTime - startTime) / 1000; // Convert milliseconds to seconds

    console.log(`***** transfer token tx send in ${duration} milliseconds *****`);
    console.log(`***** transfer token tx send in ${duration2} seconds *****`);
  }

  switch (jobType) {
    case 'deploy':
      await tokenDeploy();
      break;
    case 'mint':
      await tokenMint();
      break;
    case 'send':
      await tokenSend();
      break;
    case 'createAccount':
      let tokenAccountKey = PrivateKey.random();
      let tokenAccount = tokenAccountKey.toPublicKey();
      console.log('tokenAccountKey', tokenAccountKey.toBase58());
      console.log('tokenAccount', tokenAccount.toBase58());
      let userAccountKey = PrivateKey.random();
      let userAccount = userAccountKey.toPublicKey();
      console.log('userAccountKey', userAccountKey.toBase58());
      console.log('userAccount', userAccount.toBase58());
      let senderAccountKey = PrivateKey.random();
      let senderAccount = senderAccountKey.toPublicKey();
      console.log('senderAccountKey', senderAccountKey.toBase58());
      console.log('senderAccount', senderAccount.toBase58());
      break;
  }

  console.log('------------------- complete job ------------------------');