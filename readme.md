# express-channels

Gives application release channel functionality, without a separate build.  Can serve different static content as well as different API routes on a per-user basis.

## What good are application release channels?

Release channels can be a powerful way to get your software in the hands of select users to collect early feedback, find bugs, etc before release to the general public.  Can be configured to serve a different channel based on different environments, automatically hiding in-progress features without having to hold off on code changes.

## Install

```sh
$ npm install express-channels
```

## Environment-based Channel Selection Example

```javascript
var app = require('express'); 
var expressChannels = require('express-channels');

var environment = process.env.ENVIRONMENT; // 'dev', 'beta', or 'production'

/* Configure express-channels with all available channels and set the active one */

var xc = expressChannels({
  channels: ['dev', 'beta'], // List of channels available
  set: environment !== 'production' ? environment : null
});

/* 2: Use express-channels */

app.use(xc);

```


## User-based Channel Selection Example

```javascript
var app = require('express'); 
var expressChannels = require('express-channels');

/* 1: Configure express-channels with all available channels and selection */

var xc = expressChannels({
  channels: ['dev', 'beta'], // List of channels available
  set: function (req) {
    var channelSelection;

    // Check for your user and preferences
    if (req.user) {
      channelSelection = req.user.channel;
    }

    return channelSelection; // If undefined, no channel-specific content will be used
  }
});

/* 2: Load your user object with channel preferences using Passport, etc */

app.use(function (req, res, next) {
  req.user = { name: 'Sally', channel: 'dev' };
});

/* 3: Use the expressChannels middleware */

app.use(xc);

```

## API

### expresschannels(options)

Create a new expresschannels instance with the defined options for available channels.

```javascript
require('express-channels')({
  channels: ['dev', 'beta'],
  set: 'dev',
  cascade: true
});
```

#### Options

`channels` (Required) - `String[]` - Define the list of available channels **in preferential order of their use**.  See `cascade` setting.

`set` (Required) - `String` OR `Function` - If a string is used, the given channel will be used for all requests (useful for environment-based channel-switching with no option to override).  If a function is used, that function will be called with the request object and should return the name of the channel to be used (or a promise which resolves to the same).

`cascade` (Optional) - `Boolean` - Defaults to `true` - When enabled, channels which follow the set channel in the channels list will be used when the set channel is missing or does not serve a response.  When disabled, will prevent the system from ever serving channel content from another channel than the one currently set.

For example a router or stack with A and C provided: if the set channel is B and cascade is false, no channel-specific content will be used.  If cascade is true, the user's preference is still B, but because B is not available, C (coming after B in the channel list) will be used instead. 


### router(original, hash, options)

Use ONE of the provided middleware/routers based upon channel preferences.

```javascript
app.use(xc.router(require('./user-router'), {
  dev: require('./user-router.dev'),
  beta: require('./user-router.beta')
}));
```

#### original (required)

The original non-channel-specific router/middleware to use if no channel-specific content is used.

#### hash (required)

The hash provided maps between the channel name and the assigned router/middleware.

#### Options (optional)

`cascade` - `Boolean` - Defaults to `true` - When enabled, channels which follow the set channel in the channels list will be used when the set channel is missing or does not serve a response.  When disabled, will prevent the system from ever serving channel content from another channel than the one currently set.

For example a router with A and C provided: if the set channel is B and cascade is false, no channel-specific content will be used.  If cascade is true, the user's preference is still B, but because B is not available, C (coming after B in the channel list) will be used instead. 

### stack()

Use ANY of the provided middleware/routers in channel order, starting with set channel.


## License

[MIT](LICENSE)

