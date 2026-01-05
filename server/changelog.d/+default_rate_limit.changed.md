Changed default rate limit to from 20 requests total with 1 refill per second to 250 requests total with 25 refills per second

- This is to allow for more simultaneous uploads at once
- Running `excalibur config update` will also update the rate limit in the config file during the config update process
