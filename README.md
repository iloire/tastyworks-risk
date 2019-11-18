# Tastyworks risk simulator

Test the max upside and potential drawdowns of your Tastyworks account for a certain percentage change in the SPY. 

The software will give you the estimated upside or drawdown by forecasting option prices (using Black Scholes formula) for your current positions according to their SPY beta weight.

## Example output

```
 === estimated change in positions for 3 % change in SPY: ===

- /6AH0  ( beta = 0.163 ), P/L: $231.73
- /CLF0  ( beta = 0.8035 ), P/L: $-46.65
- /ESH0  ( beta = 1 ), P/L: $-121.43
- /ESZ9  ( beta = 1 ), P/L: $-11,490.93
- AAPL  ( beta = 1.130938 ), P/L: $-2,687.72
- AMD  ( beta = 3.206876 ), P/L: $-266.63
- CRUS  ( beta = 1.509689 ), P/L: $-142.86
- IRBT  ( beta = 2.008301 ), P/L: $2,716.39
- NIO  ( beta = 1 ), P/L: $-19.50
- QQQ  ( beta = 1.148 ), P/L: $-1,811.99
- SLV  ( beta = -0.001400338 ), P/L: $5.47
- SPY  ( beta = 1 ), P/L: $-3,958.95
- SQQQ  ( beta = -3.168238574 ), P/L: $-970.87
- TEAM  ( beta = 0.875689 ), P/L: $88.97
- TQQQ  ( beta = 1 ), P/L: $-1,495.14
- TSLA  ( beta = 0.394001 ), P/L: $176.79
- TWTR  ( beta = -0.042475 ), P/L: $-2.88
- UVXY  ( beta = -6.789902147 ), P/L: $-916.33
- VIXY  ( beta = -3.161973884 ), P/L: $-72.00
- VXX  ( beta = -4.334 ), P/L: $-1,067.90
- WORK  ( beta = 1 ), P/L: $20.59
- ZM  ( beta = 1 ), P/L: $373.51
==>: TOTAL estimated P/L: $-2,145.83 USD ======

```

## Chart:

![Risk simulator](./example/simulation.png)


## Install and run

Install the dependencies and set the tastyworks account details in the shell environment:

```
  yarn  
  export TW_USER=<your user>; export TW_PASSWORD=<your password>; export TW_ACCOUNT_ID=<your account>  
```

Now run the simulation:

```
  yarn start
```

Run in verbose mode with black scholes output:

```
  DEBUG=blackscholes yarn start
```

