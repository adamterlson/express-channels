/**
 * This sample app demonstrates dynamic channel selection (based here on URL segment) and
 * the differences between router and stack in terms of what content is available when the
 * user is subscribed to a specific channel.  See bottom for list of sample requests to try.
 */

var express = require('express');
var app = express(); 
var expressChannels = require('..');

var originalContent = createOriginalContent();
var channelContentHash = createChannelContentHash();

var router = express.Router({ mergeParams: true });
router.use(expressChannels({
  channels: ['alpha', 'beta'], // List of channels available
  set: function (req) {
    // Set the channel to whatever the URL parameter is unless it's 'none'
    var channel = req.params.channel;

    if (channel !== 'none') {
      return channel;
    }
    return;
  }
}));

// Mount the stack in addition to the original content
router.use('/stack', expressChannels.stack(channelContentHash));
router.use('/stack', originalContent);

// Mount the router in a mututally-exclusive fashion with the original content
router.use('/router', expressChannels.router(originalContent, channelContentHash));

// Use our router
app.use('/:channel', router);

// Start
app.listen(5000);


/**
 * @return {Object}
 * Create original content (router)
 */
function createOriginalContent() {
  return express.Router()
    .get('/original', function (req, res) { 
      res.send('Original Content'); 
    });
}

/**
 * @return {Object}
 * Create a hash representation of the alpha and beta channel content (routers)
 */
function createChannelContentHash() {
  var alpha = express.Router();
  var beta = express.Router();

  alpha.get('/alpha', function (req, res) { res.send('OK Alpha'); });
  beta.get('/beta', function (req, res) { res.send('OK Beta'); });

  return { 
    alpha: alpha,
    beta: beta
  };
}

/**
 * The following are the requests and expected responses which should demonstrate the
 * difference between router and stack registration methods.  The URL format is:
 *
 * GET /:activeChannel/[router or stack]/:channelSpecificContent
 */


// *** Stack ***

// GET /alpha/stack/alpha     --->    OK Alpha
// GET /alpha/stack/beta      --->    OK Beta
// GET /alpha/stack/original  --->    Original Content

// GET /beta/stack/alpha      --->    404 ERROR
// GET /beta/stack/beta       --->    OK Beta
// GET /beta/stack/original   --->    Original Content

// GET /none/stack/alpha      --->    404 ERROR
// GET /none/stack/beta       --->    404 ERROR
// GET /none/stack/original   --->    Original Content

// *** Router ***

// GET /alpha/router/alpha    --->    OK Alpha
// GET /alpha/router/beta     --->    404 ERROR
// GET /alpha/router/original --->    404 ERROR

// GET /beta/router/alpha     --->    404 ERROR
// GET /beta/router/beta      --->    OK Beta
// GET /beta/router/original  --->    404 ERROR

// GET /none/router/alpha     --->    404 ERROR
// GET /none/router/beta      --->    404 ERROR
// GET /none/router/original  --->    Original Content