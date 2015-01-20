# express-channels

Gives application release channel functionality, without a separate build.

## What good are application release channels?

Release channels can be a powerful way to get your software in the hands of select users to collect early feedback, find bugs, etc before release to the general public.

## Install

```sh
$ npm install express-channels
```

## Example

```javascript
var exc = require('express-channels');
var app = require('express'); 

/* Set up user stuff beforehand */

app.use(exc.setup({
  channels: ['dev', 'beta'], // List of channels available
  defaultChannel: 'dev' // If user doesn't specify a channel, use 'dev'
}));

/* Define user before channel selection call */

app.use(function (req, res, next) {
  req.user = { name: 'Sally', channel: 'dev' };
});

/* Set channel per user's preferences */

app.use(exc.select(function (req) {
  var channelSelection;

  if (req.user) {
    channelSelection = req.user.channel;
  }

  return channelSelection; // If undefined, default will be used
}));

//... Static content, endpoints, etc
```

## API

### setup(options)

Create a new middleware function with the defined options.

```javascript
app.use(expressChannels.setup({
  channels: ['dev', 'beta'],
  defaultChannel: 'dev'
}));
```

#### Options:

`channels` (Required) - `String[]` - Define the list of available channels **in least- to most-stable order**.  For example, if a user subscribes to first channel ('dev') but has no content while a later version (`beta`) is available, the later version will be used.  The opposite is not true.  If the last specified channel in the list has no content, no channel-specific content will be used.

`defaultChannel` (Optional) - `string` - Specifies the default channel to be used for all requests unless otherwise specified.  This is useful for configuring a channel to be used by, for example, environment.  Note that this is not on a per-request basis but for all requests.


## License

[MIT](LICENSE)

