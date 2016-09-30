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

    afterEach(function(done) {
        redmetrics.disconnect().fin(done);
    });

    describe("connection", function() {
        it("can connect to a server", function() {
            expect(redmetrics.connected).toBe(true);
        });

        it("can't omit game version", function(done) {
            redmetrics.disconnect().then(function() {
                var badOptions = _.omit(config, ["gameVersionId"]);
                function connectWithBadOptions() {
                    redmetrics.connect(badOptions);
                };
                expect(connectWithBadOptions).toThrow();
                done();
            });
        });

        it("can't connect to an inexistant server", function(done) {
            redmetrics.disconnect().then(function() {
                var badOptions = {
                    host: "notredmetrics.io",
                    gameVersionId: config.gameVersionId
                };
                redmetrics.connect(badOptions).fin(function() {
                    expect(redmetrics.connected).toBe(false);
                    done();
                });
            });
        });

        it("can't use an inexistant game version", function(done) {
            redmetrics.disconnect().then(function() {
                var badOptions = _.extend({}, config, {
                    gameVersionId: "1234"
                });
                redmetrics.connect(badOptions).fin(function() {
                    expect(redmetrics.connected).toBe(false);
                    done();
                });                
            });
        });

        it("can't connect twice without disconnect", function() {
            function connectAgain() {
                redmetrics.connect(config);
            };
            expect(connectAgain).toThrow();
        });
    });

    describe("event posting", function() {
        it("posts one", function(done) {
            redmetrics.postEvent({
                type: "start",
                section: [1, 2]
            }).then(function(result) {
                expect(result.events).toBe(1);
                done();
            });
        });

        it("posts multiple", function(done) {
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

        it("posts after connecting", function(done) {
            redmetrics.disconnect().then(function() { 
                redmetrics.postEvent({
                    type: "start",
                    section: [1, 2]
                }).then(function(result) {
                    expect(result.events).toBe(1);
                    done();
                });

                redmetrics.connect(config);
            });
        });

        it("posts while connecting", function(done) {
            redmetrics.disconnect().then(function() { 
                redmetrics.connect(config);

                // Don't wait until connected   
                redmetrics.postEvent({
                    type: "start",
                    section: [1, 2]
                }).then(function(result) {
                    expect(result.events).toBe(1);
                    done();
                });
            });
        });

        it("posts after disconnecting", function(done) {
            redmetrics.disconnect().then(function() {
                // Reconnect with a long buffering delay so that posts don't happen immediately
                var delayedConfig = _.extend({}, config, {bufferingDelay: 999999999 });
                return redmetrics.connect(delayedConfig);
            }).then(function() {
                redmetrics.postEvent({
                    type: "start",
                    section: [1, 2]
                }).then(function(result) {
                    expect(redmetrics.connected).toBe(false);

                    expect(result.events).toBe(1);
                    done();
                });

                redmetrics.disconnect();
            });
        });
    }); 

    describe("snapshot posting", function() {
        it("posts one", function(done) {
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

        it("posts multiple", function(done) {
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

        it("posts after connecting", function(done) {
            redmetrics.disconnect().then(function() {
                redmetrics.postSnapshot({
                    customData: {
                        a: 1,
                        b: 2
                    }
                }).then(function(result) {
                    expect(result.snapshots).toBe(1);
                    done();
                });

                redmetrics.connect(config);
            });
        });

        it("posts while connecting", function(done) {
            redmetrics.disconnect().then(function() { 
                redmetrics.connect(config);

                // Don't wait until connected   
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
        });

        it("posts after disconnecting", function(done) {
            redmetrics.disconnect().then(function() {
                // Reconnect with a long buffering delay so that posts don't happen immediately
                var delayedConfig = _.extend({}, config, {bufferingDelay: 999999999 });
                return redmetrics.connect(delayedConfig);
            }).then(function() {
                redmetrics.postSnapshot({
                    customData: {
                        a: 1,
                        b: 2
                    }
                }).then(function(result) {
                    expect(redmetrics.connected).toBe(false);

                    expect(result.snapshots).toBe(1);
                    done();
                });

                redmetrics.disconnect();
            });
        });
    }); 

    describe("player", function() {
        it("can get player ID", function() {
            expect(redmetrics.playerId).not.toBe(null);
        });

        it("can be provided at connection time", function(done) {
            redmetrics.disconnect().then(function() {
                var connectionOptions = _.extend({}, config, {
                    player: {
                        externalId: "1234"
                    }
                });
                redmetrics.connect(connectionOptions).then(function() {
                    expect(redmetrics.connected).toBe(true);
                    expect(redmetrics.options.player.externalId).toBe("1234");
                    done();
                });
            });
        });

        it("can provide customData", function(done) {
            redmetrics.updatePlayer({
                externalId: "azer",
                customData: { "a": 1, "b": 2 }
            }).then(function() {
                expect(redmetrics.playerInfo.externalId).toBe("azer");
                expect(_.isEqual(redmetrics.playerInfo.customData, { "a": 1, "b": 2 })).toBe(true);
                done();
            });
        });

        it("can update player after connection", function(done) {
            redmetrics.updatePlayer({
                externalId: "azer"
            }).then(function() {
                expect(redmetrics.playerInfo.externalId).toBe("azer");
                done();
            });
        });

        it("can update player before connection", function(done) {
            redmetrics.disconnect().then(function() {
                return redmetrics.updatePlayer({
                    externalId: "azer"
                });
            }).then(function() {
                expect(redmetrics.playerInfo.externalId).toBe("azer");

                return redmetrics.connect(config);
            }).then(function() {
                 expect(redmetrics.playerInfo.externalId).toBe("azer");
                 done();
            });
        });

        it("can update player during connection", function(done) {
            redmetrics.disconnect().then(function() {
                // Start connecting ...
                redmetrics.connect(config).then(function() {
                    expect(redmetrics.playerInfo.externalId).toBe("azer");
                    done();
                });

                // ... and update the player during the process
                redmetrics.updatePlayer({
                    externalId: "azer"
                });
            });
        });
    });
});
