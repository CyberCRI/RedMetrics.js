describe("RedMetrics.js", function() {
    // Use a local test configuration if available
    //var config = typeof(RedMetricsConfig) !== "undefined" ? RedMetricsConfig : {};

    // Set the delay to nothing so that the tests don't timeout (and to speed things up!)
    var config = _.defaults({}, RedMetricsConfig, {
      bufferingDelay: 0
    });


    beforeEach(function(done) {
      redmetrics.connect(config).fin(function() {
          expect(redmetrics.connected).toBe(true);
          done();
      });
    });

    afterEach(function() {
        redmetrics.disconnect();
    });

    describe("can connect", function() {
      it("can connect to a server", function() {
          expect(redmetrics.connected).toBe(true);
      });

      it("can't connect to an inexistant server", function() {
          var badOptions = _.omit(config, ["gameVersionId"]);
          function connectWithBadOptions() {
            redmetrics.connect(badOptions);
          };
          expect(connectWithBadOptions).toThrow();
      });

      it("can't omit game version", function(done) {
          var badOptions = {
              host: "notredmetrics.io",
              gameVersionId: config.gameVersionId
          };
          redmetrics.connect(badOptions).fin(function() {
              expect(redmetrics.connected).toBe(false);
              done();
          });
      });

      it("can't use an inexistant game version", function(done) {
          var badOptions = _.extend({}, config, {
            gameVersionId: "1234"
          });
          redmetrics.connect(badOptions).fin(function() {
              expect(redmetrics.connected).toBe(false);
              done();
          });
      });
    });

    describe("can post events:", function() {
      it("just one", function(done) {
        redmetrics.postEvent({
          type: "start",
          section: [1, 2]
        }).then(function(result) {
          expect(result.events).toBe(1);
          done();
        });
      });

      it("multiple ones", function(done) {
        redmetrics.postEvent({
          type: "start",
          section: [1, 2]
        });
        redmetrics.postEvent({
          type: "end",
          section: [1, 2]
        }).then(function(result) {
          expect(result.events).toBe(2);
          done();
        });
      });
    }); 

    describe("can post snapshots:", function() {
      it("just one", function(done) {
        redmetrics.postSnapshot({
          customData: {
            a: 1,
            b: 2
          }
        }).then(function(result) {
          expect(result.snapshots).toBe(1);
          done();
        });
      });

      it("multiple ones", function(done) {
        redmetrics.postSnapshot({
          customData: {
            a: 1,
            b: 2
          }
        });
        redmetrics.postSnapshot({
          customData: {
            a: 2,
            b: 1
          }
        }).then(function(result) {
          expect(result.snapshots).toBe(2);
          done();
        });
      });
    }); 

    it("can update player", function(done) {
      redmetrics.updatePlayer({
        externalId: "azer"
      }).fin(function() {
        expect(redmetrics.options.player.externalId).toBe("azer");
        done();
      });
    });
});
