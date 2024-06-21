# custom token test

Testing Custom Token Using TokenContract

## Note

This code is for custom token testing purposes.
For the accountUpdate.body.balanceChange method, the first mint() transaction runs successfully after deployment, but subsequent mint and send transactions result in errors.


## How to run this test

1. Build 
    ```sh
    npm install
    npm run build
    ```

5. Run 
    Deploy the TokenContract on L1, change the tokenAccountKey value to the PrivateKey generated during deployment, recompile, and then run the send test.

    1) Token transfer using internal.send()
    ```sh
    node build/src/customTokenTestInternal.js deploy
    ```
    change tokenAccountKey & compile
    ```sh
    npm run build
    node build/src/customTokenTestInternal.js mint
    ```
    2) Token transfer using accountUpdate.body.balanceChange:
    For the accountUpdate.body.balanceChange method, the first mint() transaction runs successfully after deployment, but subsequent mint and send transactions result in errors.
    ```sh
    node build/src/customTokenTestAccountUpdateBalance.js deploy
    ```
    change tokenAccountKey & compile
    ```sh
    npm run build
    node build/src/customTokenTestAccountUpdateBalance.js mint
    ```
## License

[Apache-2.0](LICENSE)
