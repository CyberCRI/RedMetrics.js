# RedMetrics.js

JavaScript browser client for the open source game analytics service [RedMetrics.io](https://redmetrics.io).


## Use

### Installation

The simplest way to install RedMetrics.js is via bower:

```
bower install redmetrics.js
```

RedMetrics.js can be included as a global dependency or via an AMD module (like RequireJS). For example, here are the script tags necessary to include it as a global dependency.

```
<script type="text/javascript" src="bower_components/q/q.js"></script>
<script type="text/javascript" src="bower_components/q-xhr/q-xhr.js"></script>
<script type="text/javascript" src="bower_components/underscore/underscore.js"></script>
<script type="text/javascript" src="bower_components/redmetrics.js/redmetrics.js"></script>
```

### Connection 

To connect to the RedMetrics server, call `redmetrics.connect(options)`. The most important option is

* gameVersionId (String): Required. The unique identifier that identifies the version of the game you are recording data for. Example: "0d355cd6-1b08-4dec-989d-eb4850cba680" 

To connect to another server, you can also set the following options:

* protocol (String): Defaults to "https". 
* host (String): Defaults to api.redmetrics.api
* port (String): Defaults to 443.

Finally, one last setting is available:

* bufferingDelay (Number): The minimum amount of time, in milliseconds, between subsequent requests to the server. The default is 5000, or 5 seconds. Decreasing this delay will increase the rapidity of the requests while decreasing their size. Increasing the delay has the opposite effect.


### Posting events


### Posting snapshots


### Player information



## Developing

### Tests

To run the tests, simply visit `tests.html` in a web browser. Certain browsers like Google Chrome require that the test page be hosted via a server rather than loaded from a file.

To use a different RedMetrics server for the tests, copy `testConfig.sample.js` to `testConfig.js`. Change the options within it as necessary.
