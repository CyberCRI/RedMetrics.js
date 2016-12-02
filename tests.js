describe("RedMetrics.js", function() {
    // Use a local test configuration if available
    //var config = typeof(RedMetricsConfig) !== "undefined" ? RedMetricsConfig : {};

    describe("writing", function() {
        // Set the delay to nothing so that the tests don't timeout (and to speed things up!)
        var config = _.defaults({}, RedMetricsConfig, {
            bufferingDelay: 0
        });

        var currentConnection = null;

        beforeEach(function(done) {
            currentConnection = redmetrics.prepareWriteConnection(config);

            currentConnection.connect(config).fin(function() {
                expect(currentConnection.connected).toBe(true);
                done();
            });
        });

        afterEach(function(done) {
            currentConnection.disconnect().fin(done);
        });

        describe("connection", function() {
            it("can connect to a server", function() {
                expect(currentConnection.connected).toBe(true);
            });

            it("can't omit game version", function(done) {
                currentConnection.disconnect().then(function() {
                    var badOptions = _.omit(config, ["gameVersionId"]);
                    function connectWithBadOptions() {
                        currentConnection = redmetrics.prepareWriteConnection(badOptions);
                    };
                    expect(connectWithBadOptions).toThrow();
                    done();
                });
            });

            it("can't connect to an inexistant server", function(done) {
                currentConnection.disconnect().then(function() {
                    var badOptions = {
                        host: "notredmetrics.io",
                        gameVersionId: config.gameVersionId
                    };

                    currentConnection = redmetrics.prepareWriteConnection(badOptions);
                    currentConnection.connect(badOptions).fin(function() {
                        expect(currentConnection.connected).toBe(false);
                        done();
                    });
                });
            });

            it("can't use an inexistant game version", function(done) {
                currentConnection.disconnect().then(function() {
                    var badOptions = _.extend({}, config, {
                        gameVersionId: "1234"
                    });

                    currentConnection = redmetrics.prepareWriteConnection(badOptions);
                    currentConnection.connect(badOptions).fin(function() {
                        expect(currentConnection.connected).toBe(false);
                        done();
                    });                
                });
            });

            it("can't connect twice without disconnect", function() {
                function connectAgain() {
                    currentConnection.connect();
                };
                expect(connectAgain).toThrow();
            });
        });

        describe("event posting", function() {
            it("posts one", function(done) {
                currentConnection.postEvent({
                    type: "start",
                    section: [1, 2]
                }).then(function(result) {
                    expect(result.events).toBe(1);
                    done();
                });
            });

            it("posts multiple", function(done) {
                currentConnection.postEvent({
                    type: "start",
                    section: [1, 2]
                });
                currentConnection.postEvent({
                    type: "end",
                    section: [1, 2]
                }).then(function(result) {
                    expect(result.events).toBe(2);
                    done();
                });
            });

            it("posts after connecting", function(done) {
                currentConnection.disconnect().then(function() { 
                    currentConnection.postEvent({
                        type: "start",
                        section: [1, 2]
                    }).then(function(result) {
                        expect(result.events).toBe(1);
                        done();
                    });

                    currentConnection.connect();
                });
            });

            it("posts while connecting", function(done) {
                currentConnection.disconnect().then(function() { 
                    currentConnection.connect();

                    // Don't wait until connected   
                    currentConnection.postEvent({
                        type: "start",
                        section: [1, 2]
                    }).then(function(result) {
                        expect(result.events).toBe(1);
                        done();
                    });
                });
            });

            it("posts after disconnecting", function(done) {
                currentConnection.disconnect().then(function() {
                    // Reconnect with a long buffering delay so that posts don't happen immediately
                    var delayedConfig = _.extend({}, config, { bufferingDelay: 999999999 });

                    currentConnection = redmetrics.prepareWriteConnection(delayedConfig);
                    return currentConnection.connect();
                }).then(function() {
                    currentConnection.postEvent({
                        type: "start",
                        section: [1, 2]
                    }).then(function(result) {
                        expect(currentConnection.connected).toBe(false);

                        expect(result.events).toBe(1);
                        done();
                    });

                    currentConnection.disconnect();
                });
            });
        }); 

        describe("snapshot posting", function() {
            it("posts one", function(done) {
                currentConnection.postSnapshot({
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
                currentConnection.postSnapshot({
                    customData: {
                        a: 1,
                        b: 2
                    }
                });
                currentConnection.postSnapshot({
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
                currentConnection.disconnect().then(function() {
                    currentConnection.postSnapshot({
                        customData: {
                            a: 1,
                            b: 2
                        }
                    }).then(function(result) {
                        expect(result.snapshots).toBe(1);
                        done();
                    });

                    currentConnection.connect();
                });
            });

            it("posts while connecting", function(done) {
                currentConnection.disconnect().then(function() { 
                    currentConnection.connect();

                    // Don't wait until connected   
                    currentConnection.postSnapshot({
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
                currentConnection.disconnect().then(function() {
                    // Reconnect with a long buffering delay so that posts don't happen immediately
                    var delayedConfig = _.extend({}, config, {bufferingDelay: 999999999 });
                    currentConnection = redmetrics.prepareWriteConnection(delayedConfig);
                    return currentConnection.connect();
                }).then(function() {
                    currentConnection.postSnapshot({
                        customData: {
                            a: 1,
                            b: 2
                        }
                    }).then(function(result) {
                        expect(currentConnection.connected).toBe(false);

                        expect(result.snapshots).toBe(1);
                        done();
                    });

                    currentConnection.disconnect();
                });
            });
        }); 

        describe("player", function() {
            it("can get player ID", function() {
                expect(currentConnection.playerId).not.toBe(null);
                expect(currentConnection.playerId).not.toBe(undefined);
            });

            it("can be provided at connection time", function(done) {
                currentConnection.disconnect().then(function() {
                    var connectionOptions = _.extend({}, config, {
                        player: {
                            externalId: "1234"
                        }
                    });
                    currentConnection = redmetrics.prepareWriteConnection(connectionOptions);
                    currentConnection.connect().then(function() {
                        expect(currentConnection.connected).toBe(true);
                        expect(currentConnection.options.player.externalId).toBe("1234");
                        done();
                    });
                });
            });

            it("can provide customData", function(done) {
                currentConnection.updatePlayer({
                    externalId: "azer",
                    customData: { "a": 1, "b": 2 }
                }).then(function() {
                    expect(currentConnection.playerInfo.externalId).toBe("azer");
                    expect(_.isEqual(currentConnection.playerInfo.customData, { "a": 1, "b": 2 })).toBe(true);
                    done();
                });
            });

            it("can update player after connection", function(done) {
                currentConnection.updatePlayer({
                    externalId: "azer"
                }).then(function() {
                    expect(currentConnection.playerInfo.externalId).toBe("azer");
                    done();
                });
            });

            it("can update player before connection", function(done) {
                currentConnection.disconnect().then(function() {
                    return currentConnection.updatePlayer({
                        externalId: "azer"
                    });
                }).then(function() {
                    expect(currentConnection.playerInfo.externalId).toBe("azer");

                    return currentConnection.connect();
                }).then(function() {
                     expect(currentConnection.playerInfo.externalId).toBe("azer");
                     done();
                });
            });

            it("can update player during connection", function(done) {
                currentConnection.disconnect().then(function() {
                    // Start connecting ...
                    currentConnection.connect().then(function() {
                        expect(currentConnection.playerInfo.externalId).toBe("azer");
                        done();
                    });

                    // ... and update the player during the process
                    currentConnection.updatePlayer({
                        externalId: "azer"
                    });
                });
            });
        });
    });

    describe("reading", function() {
        it("can list events", function(done) {
            redmetrics.executeQuery({ 
                gameVersion: RedMetricsConfig.gameVersionId,
                entityType: "event" 
            }, RedMetricsConfig).then(function(result) {
                expect(result.pageNumber).toBe(1);
                expect(result.pageCount).toBeGreaterThan(0);
                expect(result.perPageCount).toBeGreaterThan(0);
                expect(result.totalCount).toBeGreaterThan(0);

                expect(result.data.length).toBeGreaterThan(0);
                expect(_.isDate(result.data[0].serverTime)).toBe(true);

                done();
            });
        });

        it("can list snapshots", function(done) {
            redmetrics.executeQuery({ 
                gameVersion: RedMetricsConfig.gameVersionId,
                entityType: "snapshot" 
            }, RedMetricsConfig).then(function(result) {
                expect(result.pageNumber).toBe(1);
                expect(result.pageCount).toBeGreaterThan(0);
                expect(result.perPageCount).toBeGreaterThan(0);
                expect(result.totalCount).toBeGreaterThan(0);

                expect(result.data.length).toBeGreaterThan(0);
                expect(_.isDate(result.data[0].serverTime)).toBe(true);

                done();
            });
        });

        it("can't list events on wrong gameVersion", function(done) {
            redmetrics.executeQuery({ 
                gameVersion: "xxx",
                entityType: "event" 
            }, RedMetricsConfig).then(function(result) {
                // Shouldn't get here 
                expect(false).toBe(true);
                done();
            }).catch(function() {
                expect(true).toBe(true);
                done();
            });
        });

        it("can get next and previous pages", function(done) {
            redmetrics.executeQuery({ 
                gameVersion: RedMetricsConfig.gameVersionId,
                entityType: "event" 
            }, RedMetricsConfig).then(function(result) {
                expect(result.pageNumber).toBe(1);

                expect(result.hasPreviousPage()).toBe(false);
                expect(result.hasNextPage()).toBe(true);

                return result.nextPage();
            }).then(function(result) {                
                expect(result.pageNumber).toBe(2);

                expect(result.hasPreviousPage()).toBe(true);
                expect(result.hasNextPage()).toBe(true);

                return result.previousPage();
            }).then(function(result) {
                expect(result.pageNumber).toBe(1);

                expect(result.hasPreviousPage()).toBe(false);
                expect(result.hasNextPage()).toBe(true);

                done();
            });
        });

        it("can sort", function(done) {
            redmetrics.executeQuery({ 
                gameVersion: RedMetricsConfig.gameVersionId,
                entityType: "event",
                orderBy: ["serverTime:desc"] 
            }, RedMetricsConfig).then(function(result) {
                expect(result.data.length).toBeGreaterThan(0);
                for(var i = 1; i < result.data.length; i++) {
                    expect(result.data[i - 1].serverTime >= result.data[i].serverTime).toBe(true);
                }

                done();
            });
        });
    });
});
