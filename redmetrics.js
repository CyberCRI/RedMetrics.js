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
    var playerId = null;
    var eventQueue = [];
    var snapshotQueue = [];
    var postDeferred = null;
    var timerId = null;
    var postInProgress = false;

    var redmetrics = {
        connected: false,
        options: {}
    };

    function getUserTime() {
        return new Date().toISOString();
    }

    function createDeferred() {
        postDeferred = Q.defer();
    }

    function sendData() {
        if(eventQueue.length == 0 && snapshotQueue == 0) return;
        if(postInProgress) return;

        postInProgress = true;
        Q.spread([sendEvents(), sendSnapshots()], function(eventCount, snaphotCount) {
            postDeferred.resolve({
                events: eventCount,
                snapshots: snaphotCount
            });
        }).fail(function(error) {
            postDeferred.reject(new Error("Error posting data: " + error));
        }).fin(function() {
            postInProgress = false;
            createDeferred();
        });
    }

    function sendEvents() {
        if(eventQueue.length == 0) return Q.fcall(function() { 
            return 0; 
        });

        var request = Q.xhr({
            url: redmetrics.options.baseUrl + "/v1/event/",
            method: "POST",
            data: JSON.stringify(eventQueue),
            contentType: "application/json"
        }).then(function(result) {
           return result.data.length;
        }).fail(function(error) {
            throw new Error("Error posting events: " + error);
        }).fin(function() {
            // Clear queue
            eventQueue = [];
        });

        return request;
    }

    function sendSnapshots() {
        if(snapshotQueue.length == 0) return Q.fcall(function() { 
            return 0; 
        });

        var request = Q.xhr({
            url: redmetrics.options.baseUrl + "/v1/snapshot/",
            method: "POST",
            data: JSON.stringify(snapshotQueue),
            contentType: "application/json"
        }).then(function(result) {
            return result.data.length;
        }).fail(function(error) {
            throw new Error("Error posting snapshots: " + error);
        }).fin(function() {
            // Clear queue
            snapshotQueue = [];
        });

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
                playerId = result.data.id;
            }).fail(function(error) {
                redmetrics.connected = false;
                throw new Error("Cannot create player: " + error);
            });
        }

        function completeConnection() {
            return Q.fcall(function() { 
                redmetrics.connected = true;

                // Start sending events
                timerId = window.setInterval(sendData, redmetrics.options.bufferingDelay);
            });
        }

        return getStatus().then(checkGameVersion).then(createPlayer).then(completeConnection);
    };

    redmetrics.disconnect = function() {
        // TODO: flush event queue ?

        // Reset state 
        redmetrics.connected = false;
        redmetrics.options = {};
        playerId = null;
        eventQueue = [];

        if(timerId) {
            window.clearInterval(timerId);
            timerId = null;
        }

        if(postDeferred) {
            postDeferred.reject(new Error("RedMetrics was disconnected by user"));
            createDeferred();
        }

        // Return empty promise
        return Q.fcall(function() {}); 
    };

    redmetrics.postEvent = function(event) {
        if(event.section && _.isArray(event.section)) {
            event.section = event.section.join(".");
        }

        eventQueue.push(_.extend(event, {
            gameVersion: redmetrics.options.gameVersionId,
            player: playerId,
            userTime: getUserTime()
        }));

        return postDeferred.promise;
    };

    redmetrics.postSnapshot = function(snapshot) {
        if(snapshot.section && _.isArray(snapshot.section)) {
            snapshot.section = snapshot.section.join(".");
        }

        snapshotQueue.push(_.extend(snapshot, {
            gameVersion: redmetrics.options.gameVersionId,
            player: playerId,
            userTime: getUserTime()
        }));

        return postDeferred.promise;
    };

    redmetrics.updatePlayer = function(player) {
        if(!redmetrics.connected) throw new Error("RedMetrics is not connected");

        return Q.xhr({
            url: redmetrics.options.baseUrl + "/v1/player/" + playerId,
            method: "PUT",
            data: JSON.stringify(redmetrics.options.player),
            contentType: "application/json"
        }).then(function() {
            redmetrics.options.player = player;
            return redmetrics.options.player;
        }).fail(function(error) {
            throw new Error("Cannot update player:", error)
        });
    }

    createDeferred();

    return redmetrics;
}));
