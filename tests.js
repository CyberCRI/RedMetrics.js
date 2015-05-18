describe("RedMetrics.js", function() {
    // Use a local test configuration if available
    //var config = typeof(RedMetricsConfig) !== "undefined" ? RedMetricsConfig : {};

    // Set the delay to nothing so thatthe tests don't timeout (and to speed things up!)
    var config = _.defaults({}, RedMetricsConfig, {
      bufferingDelay: 0
    });

    afterEach(function() {
        redmetrics.disconnect();
    });

    it("can connect to a server", function(done) {
        redmetrics.connect(config).fin(function() {
            expect(redmetrics.connected).toBe(true);
            done();
        });
    });

    it("can't connect to an inexistant server", function(done) {
        var badOptions = {
            host: "notredmetrics.io"
        };
        redmetrics.connect(badOptions).fin(function() {
            expect(redmetrics.connected).toBe(false);
            done();
        });
    });

    describe("Can post events", function() {
      beforeEach(function(done) {
        redmetrics.connect(config).fin(function() {
            expect(redmetrics.connected).toBe(true);
            done();
        });
      });

      it("can post single event", function(done) {
        redmetrics.postEvent({
          type: "start",
          section: [1, 2]
        }).then(function(result) {
          expect(result).toBe(1);
          done();
        });
      });

      it("can post multiple events", function(done) {
        redmetrics.postEvent({
          type: "start",
          section: [1, 2]
        });
        redmetrics.postEvent({
          type: "end",
          section: [1, 2]
        }).then(function(result) {
          expect(result).toBe(2);
          done();
        });
      });
    }); 
});
