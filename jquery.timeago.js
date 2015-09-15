/**
 * Timeago is a jQuery plugin that makes it easy to support automatically
 * updating fuzzy timestamps (e.g. "4 minutes ago" or "about 1 day ago").
 *
 * @name chronos-timeago
 * @version 1.0.0
 * @requires jQuery v1.2.3+
 * @author Kim AS Yong - original by Ryan McGeary
 * @license MIT License - http://www.opensource.org/licenses/mit-license.php
 *
 * For usage and examples, visit:
 * http://timeago.yarp.com/
 *
 * Copyright (c) 2008-2015, Ryan McGeary (ryan -[at]- mcgeary [*dot*] org)
 */

(function (factory) {

  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } if (typeof module === 'object' && typeof module.exports === 'object') {
    factory(require('jquery'));
  } else {
    // Browser globals
    factory(jQuery);
  }


}(function ($) {
  $.timeago = function(timestamp) {
    if (timestamp instanceof Date) {
      return inWords(timestamp);
    } else if (typeof timestamp === "string") {
      return inWords($.timeago.parse(timestamp));
    } else if (typeof timestamp === "number") {
      return inWords(new Date(timestamp));
    } else {
      return inWords($.timeago.datetime(timestamp));
    }
  };
  var $t = $.timeago;

  $.extend($.timeago, {
    settings: {
      refreshMillis: 60000,
      allowPast: true,
      allowFuture: false,
      localeTitle: false,
      cutoff: 0,
      strings: {
        prefixAgo: null,
        prefixFromNow: null,
        suffixAgo: "ago",
        suffixFromNow: "from now",
        inPast: 'any moment now',
        seconds: "less than a minute",
        minute: "about a minute",
        minutes: "%d minutes",
        hour: "about an hour",
        hours: "about %d hours",
        day: "a day",
        days: "%d days",
        month: "about a month",
        months: "%d months",
        year: "about a year",
        years: "%d years",
        wordSeparator: " ",
        numbers: []
      }
    },

    inWords: function(distanceMillis) {
      if(!this.settings.allowPast && ! this.settings.allowFuture) {
          throw 'timeago allowPast and allowFuture settings can not both be set to false.';
      }

      var $l = this.settings.strings;
      var prefix = $l.prefixAgo;
      var suffix = $l.suffixAgo;
      if (this.settings.allowFuture) {
        if (distanceMillis < 0) {
          prefix = $l.prefixFromNow;
          suffix = $l.suffixFromNow;
        }
      }

      if(!this.settings.allowPast && distanceMillis >= 0) {
        return this.settings.strings.inPast;
      }

      var seconds = Math.abs(distanceMillis) / 1000;
      var minutes = seconds / 60;
      var hours = minutes / 60;
      var days = hours / 24;
      var years = days / 365;

      function substitute(stringOrFunction, number) {
        var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis) : stringOrFunction;
        var value = ($l.numbers && $l.numbers[number]) || number;
        return string.replace(/%d/i, value);
      }

      var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) ||
        seconds < 90 && substitute($l.minute, 1) ||
        minutes < 45 && substitute($l.minutes, Math.round(minutes)) ||
        minutes < 90 && substitute($l.hour, 1) ||
        hours < 24 && substitute($l.hours, Math.round(hours)) ||
        hours < 42 && substitute($l.day, 1) ||
        days < 30 && substitute($l.days, Math.round(days)) ||
        days < 45 && substitute($l.month, 1) ||
        days < 365 && substitute($l.months, Math.round(days / 30)) ||
        years < 1.5 && substitute($l.year, 1) ||
        substitute($l.years, Math.round(years));

      var separator = $l.wordSeparator || "";
      if ($l.wordSeparator === undefined) { separator = " "; }
      return $.trim([prefix, words, suffix].join(separator));
    },

    parse: function(iso8601) {
      var s = $.trim(iso8601);
      s = s.replace(/\.\d+/,""); // remove milliseconds
      s = s.replace(/-/,"/").replace(/-/,"/");
      s = s.replace(/T/," ").replace(/Z/," UTC");
      s = s.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"); // -04:00 -> -0400
      s = s.replace(/([\+\-]\d\d)$/," $100"); // +09 -> +0900
      return new Date(s);
    },
    datetime: function(elem) {
      var iso8601 = $t.isTime(elem) ? $(elem).attr("datetime") : $(elem).attr("title");
      return $t.parse(iso8601);
    },
    isTime: function(elem) {
      // jQuery's `is()` doesn't play well with HTML5 in IE
      return $(elem).get(0).tagName.toLowerCase() === "time"; // $(elem).is("time");
    }
  });



  // functions that can be called via $(el).timeago('action')
  // init is default when no action is given
  // functions are called with context of a single element
  var functions = {
    init: function() {
      var refresh_el = $.proxy(refresh, this);
      refresh_el();
      var $s = $t.settings;
      if ($s.refreshMillis > 0) {
        // Clear the old interval before creating a new one
        // The old interval would otherwise be lost and keeps running forever
        if (this._timeagoInterval != null) {
          chronos.clearInterval(this._timeagoInterval);
          console.log("init chronos.clearInterval(" + this._timeagoInterval + ")")
          this._timeagoInterval = null;
        };
        this._timeagoInterval = chronos.setInterval(refresh_el, $s.refreshMillis);
        console.log("chronos.setInterval(" + this._timeagoInterval + ")")
        //this._timeagoInterval = setInterval(refresh_el, $s.refreshMillis);
      }
    },
    update: function(time){
      var parsedTime = $t.parse(time);
      $(this).data('timeago', { datetime: parsedTime });
      if($t.settings.localeTitle) $(this).attr("title", parsedTime.toLocaleString());
      refresh.apply(this);
    },
    updateFromDOM: function(){
      $(this).data('timeago', { datetime: $t.parse( $t.isTime(this) ? $(this).attr("datetime") : $(this).attr("title") ) });
      refresh.apply(this);
    },
    dispose: function () {
      if (this._timeagoInterval != null) {
        chronos.clearInterval(this._timeagoInterval);
        console.log("chronos.clearInterval(" + this._timeagoInterval + ")")
        this._timeagoInterval = null;
      };
    }
  };

  $.fn.timeago = function(action, options) {
    var fn = action ? functions[action] : functions.init;
    if(!fn){
      throw new Error("Unknown function name '"+ action +"' for timeago");
    }
    // each over objects here and call the requested function
    this.each(function(){
      fn.call(this, options);
    });
    return this;
  };

  function refresh() {
    //check if it's still visible
    if(!$.contains(document.documentElement,this)){
      //stop if it has been removed
      $(this).timeago("dispose");
      return this;
    }

    var data = prepareData(this);
    var $s = $t.settings;

    // DEBUG REMOVE ME
    console.log("chronos.minimumInterval: " + chronos.minimumInterval());
    console.log("Math.abs(distance(data.datetime)): " + Math.abs(distance(data.datetime)));
    console.log("this.id: " + $(this).attr("id"));
    console.log("this._timeagoInterval: " + this._timeagoInterval);

    if (!isNaN(data.datetime)) {
      if ( $s.cutoff == 0 || Math.abs(distance(data.datetime)) < $s.cutoff) {
        $(this).text(inWords(data.datetime));
      }
    }
    return this;
  }

  function prepareData(element) {
    element = $(element);
    if (!element.data("timeago")) {
      element.data("timeago", { datetime: $t.datetime(element) });
      var text = $.trim(element.text());
      if ($t.settings.localeTitle) {
        element.attr("title", element.data('timeago').datetime.toLocaleString());
      } else if (text.length > 0 && !($t.isTime(element) && element.attr("title"))) {
        element.attr("title", text);
      }
    }
    return element.data("timeago");
  }

  function inWords(date) {
    return $t.inWords(distance(date));
  }

  function distance(date) {
    return (new Date().getTime() - date.getTime());
  }

  // fix for IE6 suckage
  document.createElement("abbr");
  document.createElement("time");
}));


/** @license Copyright (c) 2011 Nick Fitzgerald
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
// CHRONOS
window["chronos"] = (function () {

    // ## Variables and Utilities

    // Counter which keeps incrementing to give each task a unique id.
    var taskIdCounter = 0;

    // Store all active tasks in this object.
    var tasks = {};

    // Keep track of whether the main task runner has been initialized or not.
    var initialized = false;

    // The interval at which we check for tasks to run. It follows that the
    // smallest timeout interval you can give a task is this value.
    var INTERVAL = 50;  // milliseconds

    // Return a function which calls `fn` as if `args` had been passed in as
    // arguments directly. Don't need to worry about return values because this
    // is only used asynchrnously, and don't need to worry about new arguments
    // because we know there will be no more.
    function curry (args, fn) {
        return args.length === 0
            ? fn
            : function () {
                fn.apply(null, args);
            };
    }

    var keys = typeof Object.keys === "function"
        ? Object.keys
        : function (obj) {
            var ks = [], k;
            for ( k in obj ) {
                if ( obj.hasOwnProperty(k) ) {
                    ks.push(k);
                }
            }
            return ks;
        };

    function slice(ary, n) {
        return Array.prototype.slice.call(ary, n);
    }

    // Round n to the nearest multiple of INTERVAL.
    function roundToNearestInterval (n) {
        var diff = n % INTERVAL;
        return diff < INTERVAL / 2
            ? n - diff
            : n + INTERVAL-diff;
    }

    // ## Tasks
    //
    // A task is a function to be executed after a timeout. We abstract away the
    // implementation of a task with a constructor and functions to perform each
    // operation we might wish to perform on a task. The closure compiler will
    // inline most of these functions for us.

    // Constructor for tasks.
    function makeTask (repeats, ms, fn) {
        return {
            next: ms,
            timeout: ms,
            repeats: repeats,
            fn: fn,
            lastTimeRan: +new Date()
        };
    }

    // Decrement the ammount of time till this task should be run next and
    // returns how many milliseconds are left till the next time it should be
    // run.
    function decrementTimeTillNext (task) {
        return task.next = task.timeout - ((+new Date()) - task.lastTimeRan);
    }

    // Return true if the task repeats multiple times, false if it is a task to
    // run only once.
    function taskRepeats (task) {
        return task.repeats;
    }

    // Execute the given task.
    function runTask (task) {
        task.lastTimeRan = +new Date();
        return task.fn();
    }

    // Reset the countdown till the next time this task is executed.
    function resetTimeTillNext (task) {
        return task.next = task.timeout;
    }

    // ## Task Runner
    //
    // The task runner is the main function which runs the tasks whose timers
    // have counted down, resets the timers if necessary, and deletes tasks
    // which only run once and have already been run.
    function taskRunner () {
        var i = 0,
            tasksToRun = keys(tasks),
            len = tasksToRun.length;

        // Make sure that the taskRunner's main loop doesn't block the browser's
        // UI thread by yielding with `setTimeout` if we are running for longer
        // than 50 ms.
        function loop () {
            var start;
            for ( start = +new Date;
                  i < len && (+new Date()) - start < 50;
                  i++ ) {
                if ( tasks[tasksToRun[i]]
                     && decrementTimeTillNext(tasks[tasksToRun[i]]) < INTERVAL / 2 ) {
                    runTask(tasks[tasksToRun[i]]);
                    if ( taskRepeats(tasks[tasksToRun[i]]) ) {
                        resetTimeTillNext(tasks[tasksToRun[i]]);
                    } else {
                        delete tasks[tasksToRun[i]];
                    }
                }
            }

            if ( i < len ) {
                setTimeout(loop, 10);
            } else {
                setTimeout(taskRunner, INTERVAL);
            }
        }
        loop();
    }

    // If the task runner is not already initialized, go ahead and start
    // it. Otherwise, do nothing.
    function maybeInit () {
        if ( ! initialized ) {
            lastTimeRan = +new Date();
            setTimeout(taskRunner, INTERVAL);
            initialized = true;
        }
    }

    // Registering a task with the task runner is pretty much the same whether
    // you want it to run once, or multiple times. The only difference is
    // whether it runs once or multiple times, so we abstract this out from the
    // public set* functions. Returns a task id.
    function registerTask (repeats, fn, ms, args) {
        var id = taskIdCounter++;
        tasks[id] = makeTask(repeats,
                             roundToNearestInterval(ms),
                             curry(args, fn));
        maybeInit();
        return id;
    }

    // Remove a task from the task runner. By enforcing that `repeats` matches
    // `tasks[id].repeats` we make timeouts and intervals live in seperate
    // namespaces.
    function deregisterTask (repeats, id) {
        return tasks[id]
            && tasks[id].repeats === repeats
            && delete tasks[id];
    }

    // ## Public API
    //
    // The arguments and return values of the functions exposed in the public
    // API exactly match that of their respective timer functions defined on
    // `window` by the HTML 5 specification. The only exception is
    // `minimumInterval`, which is specific to Chronos.
    return {

        "setTimeout": function (fn, ms /*, args... */) {
            var args = slice(arguments, 2);
            return registerTask(false, fn, ms, args);
        },

        "setInterval": function (fn, ms /*, args... */) {
            var args = slice(arguments, 2);
            return registerTask(true, fn, ms, args);
        },

        "clearTimeout": function (id) {
            deregisterTask(false, id);
        },

        "clearInterval": function (id) {
            deregisterTask(true, id);
        },

        // Get or set the minimum interval which the task runner checks for
        // tasks to execute.
        "minimumInterval": function (newInterval) {
            return arguments.length === 1 && typeof newInterval === "number"
                ? INTERVAL = newInterval
                : INTERVAL;
        }
    };
}());

// set the chronos check interval to 5 seconds instead of 50 milliseconds
// to keep the cpu load as low as possible - it runs with 50 millis with
// no hickups, but its just not neccessary for timeago
chronos.minimumInterval(5000);
// CHRONOS END
