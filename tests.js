describe("RedMetrics.js", function() {
    afterEach(function() {
        redmetrics.disconnect();
    });

    it("can connect to a server", function(done) {
        redmetrics.connect(RedMetricsConfig).done(function() {
            expect(redmetrics.connected).toBe(true);
            done();
        });
    });

    it("can't connect to an inexistant server", function(done) {
        var badOptions = {
            host: "notredmetrics.io"
        };
        redmetrics.connect(badOptions).done(function() {
            expect(redmetrics.connected).toBe(false);
            done();
        });
    });
});
