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
    var baseUrl = "";

    var redmetrics = {
        connected: false
    };

    redmetrics.connect = function(options) {
        // Get options passed to the factory. Works even if options is undefined 
        options = _.defaults({}, options, {
            protocol: "https",
            host: "api.redmetrics.io",
            port: 443
        });

        // Build base URL
        if(!options.baseUrl) {
            options.baseUrl = options.protocol + "://" + options.host + ":" + options.port;
            console.log("base URL", options.baseUrl);
        }

        return Q.xhr.get(options.baseUrl + "/status").then(function(resp) {
            console.log('status is ' + resp.data);
            redmetrics.connected = true;
        }).fail(function(error) {
            console.error("Cannot connect to RedMetrics server @ π", options.baseUrl)
        });
    };

    redmetrics.disconnect = function() {
        redmetrics.connected = false;
    };


    return redmetrics;
}));


/*
    SNAPSHOT_FRAME_DELAY = 60 # Only record a snapshot every 60 frames

    eventQueue = []
    snapshotQueue = []
    timerId = null
    playerId = null
    playerInfo = {} # Current state of player 
    snapshotFrameCounter = 0 ## Number of frames since last snapshot

    configIsValid = -> options.metrics and options.metrics.gameVersionId and options.metrics.host 

    sendResults = ->
        sendEvents()
        sendSnapshots()

    sendEvents = ->
        if eventQueue.length is 0 then return 

        # Send AJAX request
        jqXhr = $.ajax 
        url: options.metrics.host + "/v1/event/" 
        type: "POST"
        data: JSON.stringify(eventQueue)
        processData: false
        contentType: "application/json"

        # Clear queue
        eventQueue = []

    sendSnapshots = ->
        if snapshotQueue.length is 0 then return 

        # Send AJAX request
        jqXhr = $.ajax 
        url: options.metrics.host + "/v1/snapshot/" 
        type: "POST"
        data: JSON.stringify(snapshotQueue)
        processData: false
        contentType: "application/json"

        # Clear queue
        snapshotQueue = []

    io =
        enterPlaySequence: ->
        if not configIsValid() then return 

        # Reset snapshot counter so that it will be sent on the first frame
        snapshotFrameCounter = SNAPSHOT_FRAME_DELAY

        # Create player
        jqXhr = $.ajax 
            url: options.metrics.host + "/v1/player/"
            type: "POST"
            data: "{}"
            processData: false
            contentType: "application/json"
        jqXhr.done (data, textStatus) -> 
            playerId = data.id
            # Start sending events
            timerId = window.setInterval(sendResults, 5000)
        jqXhr.fail (__, textStatus, errorThrown) -> 
            throw new Error("Cannot create player: #{errorThrown}")
 
        leavePlaySequence: -> 
        # If metrics session was not created then ignore
        if not playerId then return

        # Send last data before stopping 
        sendResults()

        # Stop sending events
        window.clearInterval(timerId)
        playerId = null

        provideData: -> 
        global: 
            events: []
            player: playerInfo

        establishData: (ioData, additionalData) -> 
        # Only send data in play sequence
        if not playerId then return 

        # Contains updated playerInfo if necessary
        newPlayerInfo = null
        userTime = new Date().toISOString()

        # Expecting a format like { player: {}, events: [ type: "", section: [], coordinates: [], customData: }, ... ] }
        for circuitId in _.pluck(options.circuitMetas, "id") 
            # Collate all data into the events queue (disregard individual circuits)

            # Set game version and player IDs on events
            for event in ioData[circuitId].events
            # If event section is array, change it to a dot.separated string
            if event.section and _.isArray(event.section)
                event.section = event.section.join(".")

            eventQueue.push _.extend event, 
                gameVersion: options.metrics.gameVersionId
                player: playerId
                userTime: userTime

            if snapshotFrameCounter++ >= SNAPSHOT_FRAME_DELAY
            # Reset snapshot counter
            snapshotFrameCounter = 0

            # Send input memory and input IO data as snapshots
            snapshotQueue.push 
                gameVersion: options.metrics.gameVersionId
                player: playerId
                userTime: userTime
                customData:
                inputIo: additionalData.inputIoData
                memory: additionalData.memoryData

            # Update player info
            if not _.isEqual(ioData[circuitId].player, playerInfo) 
            newPlayerInfo = ioData[circuitId].player

        # Update player info if necessary
        if newPlayerInfo
            jqXhr = $.ajax 
            url: options.metrics.host + "/v1/player/" + playerId
            type: "PUT"
            data: JSON.stringify(newPlayerInfo)
            processData: false
            contentType: "application/json"
            playerInfo = newPlayerInfo

        return null # avoid accumulating results

        destroy: -> # NOP

    return io
*/