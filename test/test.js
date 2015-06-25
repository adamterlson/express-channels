var assert = require('assert');
var express = require('express');
var request = require('supertest');
var expressChannels = require('..');

describe('express channels initialization', function () {
  it('should construct and return middleware', function () {
    var middleware = expressChannels({ channels: ['dev', 'beta'] });
    assert.equal(middleware.length, 3);
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

    describe('with cascade setting', function () {
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

    describe('without cascade setting', function () {
      var expectations = {
        alpha: ['alpha'],
        bravo: ['bravo'],
        charlie: ['charlie']
      };

      Object.keys(expectations).forEach(function (selectedChannel) {
        it(selectedChannel + ' - should not slice the channel list: ' + expectations[selectedChannel], function (done) {
          var app = express();
          app.use(expressChannels({
            channels: allChannels,
            cascade: false,
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