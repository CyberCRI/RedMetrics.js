// Wrapper methods to allow Unity WebPlayer to communicate with RedMetrics in the browser via a JavaScript bridge

// All functions take JSON-encoded strings

var rmConnection = null;

function rmConnect(optionsJson) {
    var options = JSON.parse(optionsJson);
    rmConnection = redmetrics.prepareWriteConnection(options);
    rmConnection.connect().then(function() {
        console.log("Connected to RedMetrics");
    }).fail(function(error) {
        console.error("Cannot connect to RedMetrics", error);
    });
}

function rmDisconnect() {
    rmConnection.disconnect().then(function() {
        console.log("Disconnected from RedMetrics");
    }).fail(function(error) {
        console.error("Cannot disconnect from RedMetrics", error);
    });
}

function rmPostEvent(eventJson) {
    var event = JSON.parse(eventJson);
    rmConnection.postEvent(event).then(function() {
        console.log("Event posted");
    }).fail(function(error) {
        console.error("Error posting event", error);
    });
}

function rmPostSnapshot(snapshotJson) {
    var snapshot = JSON.parse(snapshotJson);
    rmConnection.postSnapshot(snapshot).then(function() {
        console.log("Snapshot posted");
    }).fail(function(error) {
        console.error("Error posting snapshot", error);
    });
}

function rmUpdatePlayer(playerJson) {
    var player = JSON.parse(playerJson);
    rmConnection.updatePlayer(player).then(function() {
        console.log("Player updated");
    }).fail(function(error) {
        console.error("Error updating player", error);
    });    
}
