# RedMetrics.js

JavaScript browser client for the open source game analytics service [RedMetrics.io](https://redmetrics.io). RedMetrics.js buffers requests and uses promises to make integration easy. 

It allows both posting metrics and querying the server for data.

We have also included a bridge for Unity games running within the browser using the WebPlayer.


## Installation

The simplest way to install RedMetrics.js is via bower:

```
bower install RedMetrics.js
```

RedMetrics.js can be included as a global dependency or via an AMD module (like RequireJS). For example, here are the script tags necessary to include it as a global dependency.

```html
<script type="text/javascript" src="bower_components/q/q.js"></script>
<script type="text/javascript" src="bower_components/q-xhr/q-xhr.js"></script>
<script type="text/javascript" src="bower_components/underscore/underscore.js"></script>
<script type="text/javascript" src="bower_components/RedMetrics.js/redmetrics.js"></script>
```

## Writing (posting) data 

Here's a short example that shows how to post data.

```javascript
var options = { gameVersionId: "XXXXXXXX" }; // This game version will be different for each game
var connection = redmetrics.prepareWriteConnection(options);
connection.connect().then(function() {
	console.log("Connected to the RedMetrics server");
});

// ... Later on we have some events and snapshots to send

// Player started level 1
connection.postEvent({
	type: "start",
	section: "level 1"
});

// Player gained 3 points
connection.postEvent({
	type: "gain",
	section: "level 1",
	customData: 3
});

// ... Finally we disconnect from the server

connection.disconnect();

```


### Connection 

To connect to the RedMetrics server, call `redmetrics.prepareWriteConnection(options)` which will return a connection object. The most important option is

* gameVersionId (String): Required. The unique identifier that identifies the version of the game you are recording data for. Example: "0d355cd6-1b08-4dec-989d-eb4850cba680" 

Then you can call `connect()` on the connection object to actually start communicating with the server. This function returns a promise.

To connect to another server, you can also pass the following options to `redmetrics.prepareWriteConnection()`:

* protocol (String): Defaults to "https". 
* host (String): Defaults to api.redmetrics.api
* port (String): Defaults to 443.

Other options are available as well:

* bufferingDelay (Number): The minimum amount of time, in milliseconds, between subsequent requests to the server. The default is 5000, or 5 seconds. Decreasing this delay will increase the rapidity of the requests while decreasing their size. Increasing the delay has the opposite effect.
* player (Object): Describes the current player. Default is an anonymous player. This can be updated later with `redmetrics.updatePlayer()`


### Posting events

Once you are connected, you can post an event by calling `postEvent(event)` on the connection object. The `event` object can have the following properties.

* type - String. Examples are "start", "end", "win", "fail", etc.
* customData - Any data structure. For "gain" and “lose” events, specifies the number of things are gained or lost.
* section - Section as array or dot-separated string (optional)
* coordinates - Coordinate where the event occurred as 2D- or 3D-array (optional)

The event will not be sent immediately, but will be buffered and sent with other events (see the `bufferingDelay` connection option). 


### Posting snapshots

Snapshots use a method similar to events - `postSnapshot(snapshot)` on the connection object. The `snapshot` has the following properties: 

* customData - The value of the snapshot. Usually this is simply a JSON-encodable data structure that describes the state of the game.
* section - Section as array or dot-separated string (optional)

Snapshots are buffered just as events are to be sent in batches.


### Disconnecting 

To force the client to disconnect, just call `disconnect()` on the connectionObject. For most purposes this is optional, but is useful for changing players.


### Player information

By default an anonymous player is created at connection time. This player can be modified by calling `updatePlayer(player)` on the connection object with a `player` object that has some of the following properties: 

* birthDate - Date. This date _must not_ be more exact than the nearest month and year.
* region - String
* country - String
* gender - String (either "MALE", "FEMALE", or "OTHER")
* externalId - String that can be set by developers in order to link the player with another database. This _must not_ be a personally identifiable marker such as an email address.
* customData - Any JSON-encodable data structure. This _must not_ be contain personally identifiable markers such as name or exact address.

Alternatively, a player object can be provided as an connection option.


## Reading (querying) data 

To read data back from the server, simply use the `redmetrics.executeQuery()` function. For example:

```js
redmetrics.executeQuery({ 
	gameVersion: "XXXXXXXX", // This game version will be different for each game
	entityType: "event" 
}).then(function(result) {
	console.log("Found", result.totalCount, "results");

	for(var i = 0; i < result.data.length)
		console.log("Result", i, "=", result.data[i]);

	console.log("hasNextPage?", result.hasNextPage());
});
```

### Querying 

To query the server, use `redmetrics.executeQuery(searchFilter, connectionOptions)`. The search filter takes the following options:

* entityType - either "event" or "snapshot"). _Required_
* game
* gameVersion
* playerId
* type
* section
* before
* after
* beforeUserTime
* afterUserTime
* page - used to go to a particular page number
* perPage - maximum number of results per page (can be capped by the server as well)

The `connectionOptions` argument is optional, and is used to connect to a different server. It can contain either `baseUrl` (like "https://api.redmetrics.api" or a combination of:

* protocol
* host
* port

The function returns a promise that provides an object with the following properties:

* data - an array of the results of the query.

* pageNumber - the page number returned
* pageCount - the total number of pages 
* perPageCount - the number of results provided per page
* totalCount - the total number of results on all pages


### Paging

To help navigate through multiple pages, RedMetrics.js provides the functions:

* `redmetrics.hasNextPage(results)` or `results.hasNextPage()` - Returns if there are more results on a following page
* `redmetrics.hasPreviousPage(results)` or `results.hasPreviousPage()` - Returns if there are more results on a previous page
* `redmetrics.nextPage(results)` or `results.nextPage()` - Same as querying for the following page of results
* `redmetrics.previousPage(results)` or `results.previousPage()` - Same as querying for the previous page of results


## Promises

RedMetrics.js uses the [Q library](https://github.com/kriskowal/q) so that all methods return promises. A promise returned by postEvent() or postSnapshot() will only be fulfilled when the data is sent to the server.


## Unity Bridge

Games developed with Unity via their web player should have direct access to RedMetrics via the WWW class. However in practice certain requests are blocked. To get around this problem, you can have your game communicate with RedMetrics.js within the web page, and have RedMetrics.js handle the link to the server.

To make this process easy, we have created a bridge script, `redmetrics-unity.js`, that can be called via Unity using the `Application.ExternalCall()` method. To get around limitations with this method, all parameters are serialized into JSON strings before being sent.


### Use

After installing RedMetrics.js as described above, include `redmetrics-unity.js` in your HTML page as well as the other dependencies:

```html
<script type="text/javascript" src="bower_components/q/q.js"></script>
<script type="text/javascript" src="bower_components/q-xhr/q-xhr.js"></script>
<script type="text/javascript" src="bower_components/underscore/underscore.js"></script>
<script type="text/javascript" src="bower_components/RedMetrics.js/redmetrics.js"></script>
<script type="text/javascript" src="bower_components/RedMetrics.js/redmetrics-unity.js"></script>
``

Then you call `rmConnect()` from Unity, passing as an argument an options object serialized to a JSON string. 

```C#
string connectionOptions = "{ \"gameVersionId\": \"XXXXX\" }"; 
Application.ExternalCall("rmConnect", connectionOptions);
```

Currently the bridge does not inform your Unity game of whether the communication is working or not. You can verify it by watching the JavaScript console within the browser. 

The Unity bridge offers the following methods, mirroring the RedMetrics.js API:

* rmConnect(optionsJson)
* rmDisconnect()
* rmPostEvent(eventJson)
* rmPostSnapshot(snapshotJson)
* rmUpdatePlayer(playerJson)


## Developing

### Tests

To run the tests, simply visit `tests.html` in a web browser. Certain browsers like Google Chrome require that the test page be hosted via a server rather than loaded from a file.

To use a different RedMetrics server for the tests, copy `testConfig.sample.js` to `testConfig.js`. Change the options within it as necessary.


## Changelog

### 1.0.0

Added API for querying data and not just writing it.

This required breaking the previous API. In exchange, it is possible to have mulitple concurrent writing connections. In place of `redmetrics.connect()`, use something like the following:

```js
var connection = redmetrics.prepareWriteConnection({ gameVersionId: "xxx"});
connection.connect();
connection.postEvent({ type: "start" });
// ...
connection.disconnect();
```
