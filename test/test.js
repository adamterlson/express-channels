var assert = require('assert');
var express = require('express');
var request = require('supertest');
var expressChannels = require('..');

describe('express channels', function () {
  it('should be a constructor that returns middleware and have router and stack defined', function () {
    var middleware = expressChannels({ channels: ['alpha', 'bravo'] });
    assert.equal(middleware.length, 3);
    assert.equal(typeof expressChannels.router, 'function');
    assert.equal(typeof expressChannels.stack, 'function');
  });

  describe('negative cases', function () {
    it('should bomb when registering express channels without passing a channels array', function () {
      assert.throws(function () {
        expressChannels();
      }, 'Option `channels` must be defined as an array of length >= 1');
    });
    it('should bomb when registering express channels with invalid channels array', function () {
      assert.throws(function () {
        expressChannels({ channels: true });
      }, 'Option `channels` must be defined as an array of length >= 1');
    });
    it('should bomb when registering express channels with channels array of length 0', function () {
      assert.throws(function () {
        expressChannels({ channels: [] });
      }, 'Option `channels` must be defined as an array of length >= 1');
    });
  });
});

describe('middleware registration', function () {
  var allChannels = ['alpha', 'bravo', 'charlie'];

  it('should pass the request object into set', function (done) {
    var selectedChannel = 'alpha';
    var app = express();
    app.use(function (req, res, next) {
      req.test = true;
      next();
    });
    app.use(expressChannels({
      channels: allChannels,
      set: function (req) {
        assert(req.test);

        return selectedChannel;
      }
    }));

    app.use(function (req, res, next) {
      res.send(req._channels);
    });

    request(app)
      .get('/')
      .expect(200, ['alpha', 'bravo', 'charlie'], done);
  });

  describe('promise support', function () {
    it('should use resolved promise as selected channel', function (done) {
      var selectedChannel = 'alpha';
      var app = express();
      app.use(expressChannels({
        channels: allChannels,
        set: function (req) {
          return new Promise(function (resolve) {
            resolve(selectedChannel);
          });
        }
      }));

      app.use(function (req, res, next) {
        res.send(req._channels);
      });

      request(app)
        .get('/')
        .expect(200, ['alpha', 'bravo', 'charlie'], done);
    });

    it('should set channels to empty if none is selected', function (done) {
      var app = express();
      app.use(expressChannels({
        channels: allChannels,
        set: function (req) {
          return null;
        }
      }));

      app.use(function (req, res, next) {
        res.send(req._channels);
      });

      request(app)
        .get('/')
        .expect(200, [], done);
    });

    it('should pass rejected promise error to app', function (done) {
      var selectedChannel = 'alpha';
      var app = express();
      app.use(expressChannels({
        channels: allChannels,
        set: function (req) {
          return new Promise(function (resolve, reject) {
            reject(new Error());
          });
        }
      }));

      request(app)
        .get('/')
        .expect(500, done);
    });

    var expectations = {
      alpha: ['alpha', 'bravo', 'charlie'],
      bravo: ['bravo', 'charlie'],
      charlie: ['charlie']
    };

    Object.keys(expectations).forEach(function (selectedChannel) {
      it(selectedChannel + ' - should slice the channel list: ' + expectations[selectedChannel], function (done) {
        var app = express();
        app.use(expressChannels({
          channels: allChannels,
          set: function (req) {
            return selectedChannel;
          }
        }));

        app.use(function (req, res, next) {
          res.send(req._channels);
        });

        request(app)
          .get('/')
          .expect(200, expectations[selectedChannel], done);
      });
    });
  });

  describe('invalid channel selection', function () {
    it('should throw an error when selected channel is not in channel list', function (done) {
      var app = express();
      app.use(expressChannels({
        channels: allChannels,
        set: function (req) {
          return 'delta';
        }
      }));

      request(app)
        .get('/')
        .expect(500, done);
    });
  });
});

describe('router', function () {
  var app;

  describe('construction', function () {
    it('should throw if hash and original are not provided', function () {
      assert.throws(function () {
        expressChannels.router();
      });
    });

    it('should throw if hash is not provided', function () {
      assert.throws(function () {
        expressChannels.router({});
      });
    });

    it('should throw if hash is not provided', function () {
      assert.throws(function () {
        expressChannels.router(null, {});
      });
    });
  });

  describe('bad order usage', function (done) {
    it('should throw if you register a router before the base express channels', function () {
      app = express();
      app.use(expressChannels.router(makeRouter('/', 'original'), {}));

      request(app)
        .get('/')
        .expect(500, done);
    });
  });

  describe('mutually exclusive routes', function () {
    before(function () {
      app = express();
      app.use(expressChannels({
        channels: ['alpha', 'bravo'],
        set: 'bravo'
      }));

      var original = makeRouter('/', 'original');
      var alpha = makeRouter('/alpha', 'alpha');
      var bravo = makeRouter('/bravo', 'bravo');

      var xcRouter = expressChannels.router(original, {
        alpha: alpha,
        bravo: bravo
      });

      app.use(xcRouter);
    });

    it('should load bravo', function (done) {
      request(app)
        .get('/bravo')
        .expect(200, 'bravo', done);
    });

    it('should not load root', function (done) {
      request(app)
        .get('/')
        .expect(404, done);
    }); 

    it('should not load alpha', function (done) {
      request(app)
        .get('/alpha')
        .expect(404, done);
    });
  });

  describe('with cascading', function () {
    beforeEach(function () {
      app = express();
      app.use(expressChannels({
        channels: ['alpha', 'bravo', 'charlie'],
        set: 'bravo'
      }));
    });

    it('should use the selected channel content', function (done) {
      var original = makeRouter('/', 'original');
      var alpha = makeRouter('/', 'alpha');
      var bravo = makeRouter('/', 'bravo');
      var charlie = makeRouter('/', 'charlie');

      var xcRouter = expressChannels.router(original, {
        alpha: alpha,
        bravo: bravo,
        charlie: charlie
      });

      app.use(xcRouter);

      request(app)
        .get('/')
        .expect(200, 'bravo', done);
    });

    it('should use the next channels content when the first is not available', function (done) {
      var original = makeRouter('/', 'original');
      var alpha = makeRouter('/', 'alpha');
      var charlie = makeRouter('/', 'charlie');

      var xcRouter = expressChannels.router(original, {
        alpha: alpha,
        charlie: charlie
      });

      app.use(xcRouter);

      request(app)
        .get('/')
        .expect(200, 'charlie', done);
    });
  });

  describe('without cascading', function () {
    beforeEach(function () {
      app = express();
      app.use(expressChannels({
        channels: ['alpha', 'bravo', 'charlie'],
        set: 'bravo'
      }));
    });

    it('should use the channel content', function (done) {
      var original = makeRouter('/', 'original');
      var alpha = makeRouter('/', 'alpha');
      var charlie = makeRouter('/', 'charlie');

      var xcRouter = expressChannels.router(original, {
        alpha: alpha,
        charlie: charlie
      }, { cascade: false });

      app.use(xcRouter);

      request(app)
        .get('/')
        .expect(200, 'original', done);
    });
  });
});

describe('stack', function () {
  var app;

  describe('construction', function () {
    it('should throw if hash is not provided', function () {
      assert.throws(function () {
        expressChannels.stack();
      });
    });

    it('should return middleware', function () {
      assert.equal(expressChannels.stack({}).length, 3);
    });

    describe('middleware', function () {
      it('should load selected channel when available', function (done) {
        app = express();
        app.use(expressChannels({
          channels: ['alpha', 'bravo'],
          set: 'alpha'
        }));

        var original = makeMiddleware('original');
        var alpha = makeMiddleware('alpha');
        var bravo = makeMiddleware('bravo');

        var xcRouter = expressChannels.stack({
          alpha: alpha,
          bravo: bravo
        });

        app.use(xcRouter);
        app.use(original);

        request(app)
          .get('/')
          .expect(200, 'alpha', done);
      });

      it('should load next channel when first is unavailable', function (done) {
        app = express();
        app.use(expressChannels({
          channels: ['alpha', 'bravo'],
          set: 'alpha'
        }));

        var original = makeMiddleware('original');
        var bravo = makeMiddleware('bravo');

        var xcRouter = expressChannels.stack({
          bravo: bravo
        });

        app.use(xcRouter);
        app.use(original);

        request(app)
          .get('/')
          .expect(200, 'bravo', done);
      });

      it('should load next channel when first is available, but calls next', function (done) {
        app = express();
        app.use(expressChannels({
          channels: ['alpha', 'bravo'],
          set: 'alpha'
        }));

        var original = makeMiddleware('original');
        var alpha = function (req, res, next) { next() };
        var bravo = makeMiddleware('bravo');

        var xcRouter = expressChannels.stack({
          alpha: alpha,
          bravo: bravo
        });

        app.use(xcRouter);
        app.use(original);

        request(app)
          .get('/')
          .expect(200, 'bravo', done);
      });

      it('should load original if no channels return content', function (done) {
        app = express();
        app.use(expressChannels({
          channels: ['alpha', 'bravo'],
          set: 'alpha'
        }));

        var original = makeMiddleware('original');
        var alpha = function (req, res, next) { next() };
        var bravo = function (req, res, next) { next() };

        var xcRouter = expressChannels.stack({
          alpha: alpha,
          bravo: bravo
        });

        app.use(xcRouter);
        app.use(original);

        request(app)
          .get('/')
          .expect(200, 'original', done);
      });

      it('should load original if no channels are defined', function (done) {
        app = express();
        app.use(expressChannels({
          channels: ['alpha', 'bravo'],
          set: 'alpha'
        }));

        var original = makeMiddleware('original');

        var xcRouter = expressChannels.stack({});

        app.use(xcRouter);
        app.use(original);

        request(app)
          .get('/')
          .expect(200, 'original', done);
      });
    });
  });
});

function makeRouter(url, message) {
  var router = express.Router();
  router.get(url, function (req, res) {
    res.send(message);
  });
  return router;
}
function makeMiddleware(message) {
  return function (req, res, next) {
    res.send(message);
  };
}