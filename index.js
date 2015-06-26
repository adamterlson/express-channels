'use strict';

/**
 * Module dependencies.
 * @private
 */

var express = require('express');

/**
 * Module exports.
 */

module.exports = expresschannels;
module.exports.router = router;

function expresschannels(options) {
  var opts = options || {};

  // option defaults
  var channels = opts.channels || [];
  var set = opts.set || function () { return opts.default; };

  // option validation
  if (!Array.isArray(channels) || channels.length === 0) {
    throw new Error('Option `channels` must be defined as an array of length >= 1');
  }

  return function setChannelMiddleware(req, res, next) {
    // promise support
    var selectChannel;
    if (typeof set === 'function') {
      selectChannel = Promise.resolve(set());
    } else {
      selectChannel = Promise.resolve(set);
    }

    selectChannel.then(function (channelKey) {
      // no channel selection
      if (!channelKey) {
        req._channels = [];
        return next();
      }

      // invalid channel selection
      if (channels.indexOf(channelKey) === -1) {
        return next(new Error('Channel `' + channelKey + '` not found in list of channels: ' + channels));
      }
      
      req._channels = channels.slice(channels.indexOf(channelKey));

      next();
    }, next);
  };
};

function stack(hash, original) {
  if (!hash) {
    throw new Error('Must provide hash for channel-specific content.');
  }
  if (!original) {
    throw new Error('Must provide original middleware/router for non-channel content.');
  }

  return function (req, res, next) {
    // Get the list of available channel content
    var channelContent = req._channels
      .map(function (channel) {
        return hash[channel];
      });

    channelContent.push(original);

    function load(i) {
      var n;
      if (i === channelContent.length - 1) {
        n = next; // At the last middleware, exit out via parent next
      }
      else {
        n = load.bind(null, i+1); // Load the next middleware
      }
      channelContent[i](req, res, n);
    }

    load(0);
  };
}

function router(original, hash, options) {
  var opts = options || {};

  opts.cascade = opts.cascade == null ? true : opts.cascade;

  if (!hash) {
    throw new Error('Must provide hash for channel-specific content.');
  }
  if (!original) {
    throw new Error('Must provide original middleware/router for non-channel content.');
  }

  // create router for URL branching
  var router = express.Router({ mergeParams: true });

  router.use(function (req, res, next) {
    if (!req._channels || !Array.isArray(req._channels)) {
      next(new Error('Must register the expressChannels middleware before using `router`.'));
    }

    next();
  });

  // modify the URL with a new segment specific to each channel key
  router.use(flagUrlMiddleware(hash, opts.cascade));

  // register provided channel-specific content under the appropriate segments
  Object.keys(hash).forEach(function (channelKey) {
    router.use(routeFlag(channelKey), hash[channelKey]);
  });

  // use the original router lastly under a route so its mututally exclusive with channel content
  // if you don't do this, registering routes /foo and /bar on the original with /baz on a channel, 
  // being on the channel will serve /foo, /bar and /baz.  This might be unexpected behavior.
  router.use(routeFlag(''), original);

  // restore the URL back to the original for future handlers
  router.use(restoreUrlMiddleware);

  return router;
}

function routeFlag(key) {
  return '/__' + key.toUpperCase() + '__';
}

function flagUrlMiddleware(hash, cascade) {
  return function (req, res, next) {
    var channelContent;
    var channelKey;
    var url = req.url;
    var i = 0;

    // req defines channels A, B, and C (therfore A is user's choice)
    // IF version A is defined, channel key is A
    // ELSE IF version B is defined, channel key is B, etc

    // req defines channels B and C (therefore B is user's choice)
    // IF version A is defined, channel key is undefined
    // ELSE IF version B is defined, channel key is B, etc

    if (cascade) {
      while (i < req._channels.length && !channelContent) {
        channelKey = req._channels[i];
        channelContent = hash[channelKey];
        i++;
      }
    } else {
      channelKey = req._channels[0];
      channelContent = hash[channelKey];
    }

    // If there is no channel content, use the original
    if (!channelContent) {
      channelKey = '';
    }

    req._originalUrl = url;

    req.url = routeFlag(channelKey);

    if (url[0] !== '/') {
      req.url += '/';
    }

    req.url += url;

    next();
  };
}

function restoreUrlMiddleware(req, res, next) {
  if (req._originalUrl) {
    req.url = req._originalUrl;
    delete req._originalUrl;
  }
  next();
}

