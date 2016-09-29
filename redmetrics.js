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
    var eventQueue = [];
    var snapshotQueue = [];
    var postDeferred = Q.defer();
    var timerId = null;
    var connectionPromise = null;

    var redmetrics = {
        connected: false,
        playerId: null,
        playerInfo: {},
        options: {}
    };

    function getUserTime() {
        return new Date().toISOString();
    }

    function sendData() {
        if(eventQueue.length == 0 && snapshotQueue == 0) return;

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
                gameVersion: redmetrics.options.gameVersionId,
                player: redmetrics.playerId,
            });
        }

        var request = Q.xhr({
            url: redmetrics.options.baseUrl + "/v1/event/",
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
                gameVersion: redmetrics.options.gameVersionId,
                player: redmetrics.playerId,
            });
        }

        var request = Q.xhr({
            url: redmetrics.options.baseUrl + "/v1/snapshot/",
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

    redmetrics.connect = function(connectionOptions) {
        if(redmetrics.connected) throw new Error("RedMetrics is already connected. Call redmetrics.disconnect() before connecting again.");

        // Get options passed to the factory. Works even if connectionOptions is undefined 
        redmetrics.options = _.defaults({}, connectionOptions, {
            protocol: "https",
            host: "api.redmetrics.io",
            port: 443,
            bufferingDelay: 5000,
            player: {}
        });

        // Build base URL
        if(!redmetrics.options.baseUrl) {
            redmetrics.options.baseUrl = redmetrics.options.protocol + "://" + redmetrics.options.host + ":" + redmetrics.options.port;
        }

        if(!redmetrics.options.gameVersionId) {
            throw new Error("Missing options.gameVersionId");
        }

        _.extend(redmetrics.options.player, redmetrics.playerInfo);

        // The player info may change during the connection process, so hold onto it
        var oldPlayerInfo = redmetrics.playerInfo;

        function getStatus() {
            return Q.xhr.get(redmetrics.options.baseUrl + "/status").fail(function(error) {
                redmetrics.connected = false;
                throw new Error("Cannot connect to RedMetrics server", redmetrics.options.baseUrl);
            });
        }

        function checkGameVersion() {
            return Q.xhr.get(redmetrics.options.baseUrl + "/v1/gameVersion/" + redmetrics.options.gameVersionId).fail(function(error) {
                redmetrics.connected = false;
                throw new Error("Invalid gameVersionId");
            });
        }

        function createPlayer() {
            return Q.xhr({
                url: redmetrics.options.baseUrl + "/v1/player/",
                method: "POST",
                data: JSON.stringify(redmetrics.options.player),
                contentType: "application/json"
            }).then(function(result) {
                redmetrics.playerId = result.data.id;
            }).fail(function(error) {
                redmetrics.connected = false;
                throw new Error("Cannot create player: " + error);
            });
        }

        function establishConnection() {
            redmetrics.connected = true;

            // Start sending events
            timerId = window.setInterval(sendData, redmetrics.options.bufferingDelay);

            // If the playerInfo has been modified during the connection process, call updatePlayer()
            if(oldPlayerInfo != redmetrics.playerInfo) return redmetrics.updatePlayer(redmetrics.playerInfo);
        }   

        // Hold on to connection promise so that other functions may listen to it
        connectionPromise = getStatus().then(checkGameVersion).then(createPlayer).then(establishConnection);
        return connectionPromise;
    };

    redmetrics.disconnect = function() {
        function resetState() {
            redmetrics.playerId = null;
            connectionPromise = null;

            redmetrics.connected = false;
            redmetrics.options = {};
            redmetrics.playerInfo = {};
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

    redmetrics.postEvent = function(event) {
        if(event.section && _.isArray(event.section)) {
            event.section = event.section.join(".");
        }

        eventQueue.push(_.extend(event, {
            userTime: getUserTime()
        }));

        return postDeferred.promise;
    };

    redmetrics.postSnapshot = function(snapshot) {
        if(snapshot.section && _.isArray(snapshot.section)) {
            snapshot.section = snapshot.section.join(".");
        }

        snapshotQueue.push(_.extend(snapshot, {
            userTime: getUserTime()
        }));

        return postDeferred.promise;
    };

    redmetrics.updatePlayer = function(playerInfo) {
        redmetrics.playerInfo = playerInfo;

        // If we're not yet connected, return immediately
        if(!redmetrics.connected) return Q(redmetrics.playerInfo); 

        // Otherwise update on the server
        return Q.xhr({
            url: redmetrics.options.baseUrl + "/v1/player/" + redmetrics.playerId,
            method: "PUT",
            data: JSON.stringify(redmetrics.playerInfo),
            contentType: "application/json"
        }).then(function() {
            return redmetrics.playerInfo;
        }).fail(function(error) {
            throw new Error("Cannot update player:", error)
        });
    }

    return redmetrics;
}));

