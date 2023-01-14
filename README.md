# Tastyworks risk simulator

![I, Robot](https://raw.githubusercontent.com/iloire/tastyworks-risk/master/robot-trader.png)

Test the max upside and potential drawdowns of your Tastyworks account for a certain percentage change in the SPY.

The software will give you the estimated upside or drawdown by forecasting option prices (using Black Scholes formula) for your current positions according to their SPY beta weight.

## Example output

```
{
 "ZM": {
  "meta": {
   "beta": 1,
   "currentPriceUnderlying": 74.55,
   "volatility": "0.611642779",
   "riskFreeInterestRate": 0.03
  },
  "byChangeInSPYIndex": [
   {
    "changePercentage": -3,
    "simulation": {
     "newUnderlyingSimulatedPrice": 72.31349999999999,
     "betaWeightedChangePercentage": -3,
     "positions": {
      "ZM    200117P00075000": {
       "direction": "Short",
       "quantity": 3,
       "currentPrice": 6.25,
       "simulatedPrice": 8.003068758248162,
       "currentValue": -1875,
       "simulatedValue": -2400.9206274744483,
       "pl": -525.9206274744483
      }
     },
     "pl": -525.9206274744483
    }
   }
}
...
```

## Chart:

![Risk simulator](./example/simulation.png)

## Install and run

Install the dependencies and set the tastyworks account details in the shell environment:

```
  yarn
  export TW_USER=<your user>; export TW_PASSWORD=<your password>; export TW_ACCOUNT_ID=<your account>
```

Now run the simulation or create a chart witht the estimated max drawdown and upside:

```
  node example/index.js
  node example/chart.js
```

## Next

- Move to Typescript in the next chance I have.
