1. Deposit collateral: ETH | WETH
2. Borrow another asset: DAI
3. Repay the DAI



#### TradeOffs of Forking
Pros: quick, easy, resemble what's on mainnet
Const: we need an api, some contracts are complex to work with

### Primera prueba exitosa (en un entorno de desarrollo)
```bash
Searching for: mainnet ...
Victim found...

Victim: 0x855C37a0711481c27Ff8C28B93bb0c991f45d01e
Col token: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
Debt token 0x6B175474E89094C44Da98b954EedeAC495271d0F
My balance: 9999.98312761344606016
Gas cost: 0.0024
Bonus: 0.003014984447927441

Swap amount in:  0.060299688958548822
Contract data:
ETH balance:  0.0
DAI balance: 0.0
WETH balance: 0.0
WETH balance: 0.0
-

Deployer data:
My ETH balance:  9999.98312761344606016
DAI balance: 0.0
WETH balance: 0.0
WETH balance: 0.0

Getting victim data before liquidation...

Account:  0x855C37a0711481c27Ff8C28B93bb0c991f45d01e
Have 0.386078043088023356 worth of ETH deposited.
Have 0.332925285623063908 worth of ETH borrowed.
His helthFactor is: 0.9768922864740794.

liquidando...
Done!
Getting victim data after liquidation...

Account:  0x855C37a0711481c27Ff8C28B93bb0c991f45d01e
Have 0.322989222552045925 worth of ETH deposited.
Have 0.27284069531642558 worth of ETH borrowed.
His helthFactor is: 0.9954586757266061.

Contract data:
ETH balance:  0.0
DAI balance: 0.0
WETH balance: 0.0
WETH balance: 0.0

Deployer data:
My ETH balance:  9999.921576663687511338
DAI balance: 0.0
WETH balance: 0.063088821967285576
WETH balance: 0.063088821967285576

Deployer data:
My ETH balance:  9999.984619861613887394
DAI balance: 0.0
WETH balance: 0.0
WETH balance: 0.0

Liquidation excecuted successfully!

```