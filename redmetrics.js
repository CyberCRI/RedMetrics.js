// Uses AMD or browser globals to create a module.

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(["q-xhr"], factory);
    } else {
        // Browser globals
        root.redmetrics = factory(root.b);
    }
}(this, function (b) {

    // TODO: delete this
    // if it was by itself
    //     connection = redmetrics.connectToRead({ server, gameVersion })
    //     connection.queryEvents({ pageNumber (opt), type, ... }).then(( cursor ))
    //         cursor.data is data
    //         cursor.pageNumber
    //         cursor.pageCount
    //         cursor.hasNextPage()
    //         cursor.nextPage() = redmetrics.queryEvents({ ++pageNumber })
    //     connection.disconnect() // no op

    //     // non-stateful API
    //     redmetrics.executeQuery({ all options })

    // how to combine it?
    //     connection = redmetrics.connectToWrite({ server, gameVersion })
    //     connection.postEvent()
    //     connection.postSnapshot()
    //     connection.disconnect()

    //     // non-stateful API
    //     redmetrics.createPlayer({ })
    //     redmetrics.updatePlayer({ })
    //     redmetrics.createEvent({ })
    //     redmetrics.createSnapshot({ })

    function prepareWriteConnection(connectionOptions) {
        var eventQueue = [];
        var snapshotQueue = [];
        var postDeferred = Q.defer();
        var timerId = null;
        var connectionPromise = null;

        // This data structure will be returned from the connectToWrite() function
        var writeConnection = {
            connected: false,
            playerId: null,
            playerInfo: {},
            // Get options passed to the factory. Works even if connectionOptions is undefined 
            options: _.defaults({}, connectionOptions, {
                protocol: "https",
                host: "api.writeConnection.io",
                port: 443,
                bufferingDelay: 5000,
                player: {}
            }),
        };

        // Build base URL
        if(!writeConnection.options.baseUrl) {
            writeConnection.options.baseUrl = writeConnection.options.protocol + "://" + writeConnection.options.host + ":" + writeConnection.options.port;
        }

        if(!writeConnection.options.gameVersionId) {
            throw new Error("Missing options.gameVersionId");
        }


        function getUserTime() {
            return new Date().toISOString();
        }

        function sendData() {
            if(eventQueue.length == 0 && snapshotQueue.length == 0) return;

            Q.spread([sendEvents(), sendSnapshots()], function(eventCount, snaphotCount) {
                postDeferred.resolve({
                    events: eventCount,
                    snapshots: snaphotCount
                });
            }).fail(function(error) {
                postDeferred.reject(new Error("Error posting data: " + error));
            }).fin(function() {
                // Create new deferred
                postDeferred = Q.defer();
            });
        }

        function sendEvents() {
            if(eventQueue.length == 0) return Q.fcall(function() { 
                return 0; 
            });

            // Add data related to current connection
            for(var i = 0; i < eventQueue.length; i++) {
                _.extend(eventQueue[i], {
                    gameVersion: writeConnection.options.gameVersionId,
                    player: writeConnection.playerId,
                });
            }

            var request = Q.xhr({
                url: writeConnection.options.baseUrl + "/v1/event/",
                method: "POST",
                data: JSON.stringify(eventQueue),
                contentType: "application/json"
            }).then(function(result) {
               return result.data.length;
            }).fail(function(error) {
                throw new Error("Error posting events: " + error);
            });

            // Clear queue
            eventQueue = [];

            return request;
        }

        function sendSnapshots() {
            if(snapshotQueue.length == 0) return Q.fcall(function() { 
                return 0; 
            });

            // Add data related to current connection
            for(var i = 0; i < snapshotQueue.length; i++) {
                _.extend(snapshotQueue[i], {
                    gameVersion: writeConnection.options.gameVersionId,
                    player: writeConnection.playerId,
                });
            }

            var request = Q.xhr({
                url: writeConnection.options.baseUrl + "/v1/snapshot/",
                method: "POST",
                data: JSON.stringify(snapshotQueue),
                contentType: "application/json"
            }).then(function(result) {
                return result.data.length;
            }).fail(function(error) {
                throw new Error("Error posting snapshots: " + error);
            });

            // Clear queue
            snapshotQueue = [];

            return request;
        }

        writeConnection.connect = function() {
            if(writeConnection.connected) throw new Error("writeConnection is already connected. Call writeConnection.disconnect() before connecting again.");

            _.extend(writeConnection.options.player, writeConnection.playerInfo);

            // The player info may change during the connection process, so hold onto it
            var oldPlayerInfo = writeConnection.playerInfo;

            function getStatus() {
                return Q.xhr.get(writeConnection.options.baseUrl + "/status").fail(function(error) {
                    writeConnection.connected = false;
                    throw new Error("Cannot connect to writeConnection server", writeConnection.options.baseUrl);
                });
            }

            function checkGameVersion() {
                return Q.xhr.get(writeConnection.options.baseUrl + "/v1/gameVersion/" + writeConnection.options.gameVersionId).fail(function(error) {
                    writeConnection.connected = false;
                    throw new Error("Invalid gameVersionId");
                });
            }

            function createPlayer() {
                return Q.xhr({
                    url: writeConnection.options.baseUrl + "/v1/player/",
                    method: "POST",
                    data: JSON.stringify(writeConnection.options.player),
                    contentType: "application/json"
                }).then(function(result) {
                    writeConnection.playerId = result.data.id;
                }).fail(function(error) {
                    writeConnection.connected = false;
                    throw new Error("Cannot create player: " + error);
                });
            }

            function establishConnection() {
                writeConnection.connected = true;

                // Start sending events
                timerId = window.setInterval(sendData, writeConnection.options.bufferingDelay);

                // If the playerInfo has been modified during the connection process, call updatePlayer()
                if(oldPlayerInfo != writeConnection.playerInfo) return writeConnection.updatePlayer(writeConnection.playerInfo);
            }   

            // Hold on to connection promise so that other functions may listen to it
            connectionPromise = getStatus().then(checkGameVersion).then(createPlayer).then(establishConnection);
            return connectionPromise;
        };

        writeConnection.disconnect = function() {
            function resetState() {
                writeConnection.playerId = null;
                connectionPromise = null;

                writeConnection.connected = false;
            }

            // Stop timer
            if(timerId) {
                window.clearInterval(timerId);
                timerId = null;
            }

            if(connectionPromise) {
                // Flush any remaining data
                return connectionPromise.then(sendData).fin(resetState);
            } else {
                return Q.fcall(resetState);
            }
        };

        writeConnection.postEvent = function(event) {
            if(event.section && _.isArray(event.section)) {
                event.section = event.section.join(".");
            }

            eventQueue.push(_.extend(event, {
                userTime: getUserTime()
            }));

            return postDeferred.promise;
        };

        writeConnection.postSnapshot = function(snapshot) {
            if(snapshot.section && _.isArray(snapshot.section)) {
                snapshot.section = snapshot.section.join(".");
            }

            snapshotQueue.push(_.extend(snapshot, {
                userTime: getUserTime()
            }));

            return postDeferred.promise;
        };

        writeConnection.updatePlayer = function(playerInfo) {
            writeConnection.playerInfo = playerInfo;

            // If we're not yet connected, return immediately
            if(!writeConnection.connected) return Q(writeConnection.playerInfo); 

            // Currently writeConnection requires customData to be encoded as a string
            if(_.has(playerInfo, "customData")) {
                // Clone object to avoid modifying writeConnection.playerInfo
                playerInfo = _.clone(playerInfo);
                playerInfo.customData = JSON.stringify(playerInfo.customData);
            }

            // Otherwise update on the server
            return Q.xhr({
                url: writeConnection.options.baseUrl + "/v1/player/" + writeConnection.playerId,
                method: "PUT",
                data: JSON.stringify(playerInfo),
                contentType: "application/json"
            }).then(function() {
                return writeConnection.playerInfo;
            }).fail(function(error) {
                throw new Error("Cannot update player:", error)
            });
        }

        return writeConnection;
    }

    return { 
        prepareWriteConnection: prepareWriteConnection
    };
}));

