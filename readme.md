# express-channels

Gives application release channel functionality, without a separate build.  Can serve different static content as well as different API routes on a per-user basis.

## What good are application release channels?

Release channels can be a powerful way to get your software in the hands of select users to collect early feedback, find bugs, etc before release to the general public.  Can be configured to serve a different channel by default for different environments, automatically hiding in-progress features without having to hold off on code changes.

## Install

```sh
$ npm install express-channels
```

## Per-environment Channel Example

```javascript
var app = require('express'); 
var expressChannels = require('express-channels');

var environment = process.env.ENVIRONMENT; // 'dev', 'beta', or 'production'

/* Configure express-channels with all available channels and a default */

var xc = expressChannels({
  channels: ['dev', 'beta'], // List of channels available
  default: environment !== 'production' ? environment : null
});

/* 2: Use express-channels */

app.use(xc);

```


## Per-User Channel Example

```javascript
var app = require('express'); 
var expressChannels = require('express-channels');

/* 1: Configure express-channels with all available channels and a default */

var xc = expressChannels({
  channels: ['dev', 'beta'] // List of channels available
});

/* 2: Load your user object with channel preferences using Passport, etc */

app.use(function (req, res, next) {
  req.user = { name: 'Sally', channel: 'dev' };
});

/* 3: Set channel, as per user's preferences */

app.use(xc(function (req) {
  var channelSelection;

  // Check for your user and preferences
  if (req.user) {
    channelSelection = req.user.channel;
  }

  return channelSelection; // If undefined, default will be used
}));

//... Static content, endpoints, etc
```

## API

### expresschannels(options)

Create a new expresschannels instance with the defined options for available channels and the default.

```javascript
require('express-channels')({
  channels: ['dev', 'beta'],
  default: 'dev',
  cascade: true
});
```

#### Options

`channels` (Required) - `String[]` - Define the list of available channels **in preferential order of their use**.  See `cascade` setting.

`default` (Optional) - `String` - Default none - Specifies the default channel to be used for all requests unless otherwise specified.  This is useful for configuring a channel to be used by, for example, environment.  This is for all requests, but can be overridden on a per-user request basis.

`cascade` (Optional) - `Boolean` - Default `true` - When set to true, channels will make requests to the following channels in the list.  For example, if the first channel ('dev') is selected by the user but does not serve a response, subsequent channels ('beta') will be attempted before ultimately using non channel-specific content.  Non channel-specific content will always be attempted if there is no channel-specific content.


### router(hash, original)

Optionally use one of the provided middleware/routers based upon channel preferences.

```javascript
app.use(xc.router({
  dev: require('./user-router.dev'),
  beta: require('./user-router.beta')
}, require('./user-router')));
```

#### hash

The hash provided maps between the channel name and the assigned router/middleware.

#### original

The final argument is the base, non-channel-specific router/middleware to use.




## License

[MIT](LICENSE)

