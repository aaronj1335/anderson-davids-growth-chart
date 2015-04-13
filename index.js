/*global jQuery */
/*!
* FitText.js 1.2
*
* Copyright 2011, Dave Rupert http://daverupert.com
* Released under the WTFPL license
* http://sam.zoy.org/wtfpl/
*
* Date: Thu May 05 14:23:00 2011 -0600
*/

(function( $ ){

  $.fn.fitText = function( kompressor, options ) {

    // Setup options
    var compressor = kompressor || 1,
        settings = $.extend({
          'minFontSize' : Number.NEGATIVE_INFINITY,
          'maxFontSize' : Number.POSITIVE_INFINITY
        }, options);

    return this.each(function(){

      // Store the object
      var $this = $(this);

      // Resizer() resizes items based on the object width divided by the compressor * 10
      var resizer = function () {
        $this.css('font-size', Math.max(Math.min($this.width() / (compressor*10), parseFloat(settings.maxFontSize)), parseFloat(settings.minFontSize)));
      };

      // Call once to set.
      resizer();

      // Call on resize. Opera debounces their resize by default.
      $(window).on('resize.fittext orientationchange.fittext', resizer);

    });

  };

})( jQuery );
/* end FitText.js */

/**
 * main js
 */

(function(window) {
  var labelDateFormatter = d3.time.format('%A %B %e, at %I:%M %p');
  var weights = [
    {when: "2015-03-29T01:14:00.000Z", weight: 8 + 11 / 16},
    {when: "2015-03-30T05:15:00.000Z", weight: 8 +  3 / 16},
    {when: "2015-03-31T16:00:00.000Z", weight: 7 + 12 / 16},
    {when: "2015-04-03T19:40:00.000Z", weight: 8 +  3 / 16},
    {when: "2015-04-07T15:48:00.000Z", weight: 8 +  5 / 16},
    {when: "2015-04-10T20:00:00.000Z", weight: 8          }
  ];
  var start = new Date(weights[0].when).valueOf();
  var hasImpact = false;

  weights = weights.reduce(function(weights, d) {
    var days = weights.length?
      (new Date(d.when).valueOf() - start) / 1000 / 60 / 60 / 24 : 0;
    return weights.concat([{when: days, weight: d.weight}])
  }, []);

  function chartWeight() {
    var $weight = $('#weight').empty();
    var margin = {top: 20, right: 20, bottom: 30, left: 70};
    var width = $weight.width() - margin.left - margin.right;
    var height = 250 - margin.top - margin.bottom - 15;

    function add10Percent(extent) {
      var magnitude = extent[1] - extent[0];
      var tenPercent = magnitude * 0.1;
      return [extent[0] - magnitude * .1, extent[1] + magnitude * .1];
    }

    var x = d3.scale.linear()
      .domain(add10Percent(d3.extent(weights, function(d) { return d.when })))
      .range([0, width]);

    var y = d3.scale.linear()
      .domain(add10Percent(d3.extent(weights, function(d) { return d.weight })))
      .range([height, 0]);

    var xAxis = d3.svg.axis()
      .scale(x)
      .ticks(8)
      .orient('bottom');

    var yAxis = d3.svg.axis()
      .scale(y)
      .ticks(4)
      .orient('left');

    var line = d3.svg.line()
      .interpolate('monotone')
      .x(function(d) { return x(d.when); })
      .y(function(d) { return y(d.weight); });

    var svg = d3.select($weight[0]).append("svg")
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top +')');

    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis)
      .append('text')
        .attr('x', width)
        .attr('y', -5)
        .style('text-anchor', 'end')
        .text('Days since launch');


    svg.append('g')
      .attr('class', 'y axis')
      .call(yAxis)
      .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('dy', '-3em')
        .attr('x', '-3.5em')
        .style('text-anchor', 'end')
        .text('Pounds');

    var label = svg.append('text')
      .attr('y', height + margin.top - 64)
      .attr('class', 'label invisible');

    state({
      chart: {
        svg: svg,
        x: x,
        y: y,
        label: label,
        weights: weights,
        line: line
      },
      weightLineDrawn: false
    });
  }

  function chartIsFullyInView() {
    var s = state();

    if (!s.articleVisible || s.svgBottom == null)
      return false;

    if (s.chartIsFullyInView)
      return true;

    var viewportBottom = s.scroll + s.viewportHeight;

    return viewportBottom >= s.svgBottom;
  }

  function animateWeightLine() {
    var incrementDuration = 400;
    var s = state();
    var path = s.chart.svg.append('path')
      .datum(s.chart.weights)
      .attr('class', 'line')
      .attr('d', s.chart.line);
    var pathLen = path.node().getTotalLength();

    function setLabel(d) {
      var weight = 'Little man weighed ' + Math.floor(d.weight) + ' pounds ' +
        Math.floor(d.weight % 1 * 16) + ' ounces';
      var date = 'On ' + labelDateFormatter(new Date(d.when));

      unsetLabel();

      s.chart.label.text('').attr('class', 'label');

      s.chart.label.append('tspan').attr('x', 12).attr('dy', '1em').text(date);
      s.chart.label.append('tspan').attr('x', 12).attr('dy', '1.1em').text(weight);
    }

    function unsetLabel() {
      s.chart.label.attr('class', 'label invisible');
    }

    path
      .attr('stroke-dasharray', pathLen + ' ' + pathLen)
      .attr('stroke-dashoffset', pathLen)
      .transition()
        .duration(incrementDuration * (s.chart.weights.length - 1))
        .ease('linear')
        .attr('stroke-dashoffset', 0);

    s.chart.svg.selectAll('.measurement')
      .data(s.chart.weights)
      .enter()
        .append('circle')
        .attr('class', 'measurement')
        .attr('r', 0)
        .attr('cx', function(d) { return s.chart.x(d.when) })
        .attr('cy', function(d) { return s.chart.y(d.weight) })
        .on('mouseover', setLabel)
        .on('mouseout', unsetLabel)
        .transition()
          .delay(function(d, i) { return i * incrementDuration })
          .ease('elastic')
          .duration(500)
          .attr('r', 8);

    state({weightLineDrawn: true});
  }

  function showContent() {
    $('#loading').hide();
    $('#content').removeClass('invisible')
  }

  function setHeaderImageSize() {
    $('.dat-lil-guy-tho').height($('.what-it-is').height());
    state({headerImageIsSized: true});
  }

  function onStateChange(event, curState, prevState) {
    if (curState.heroImageLoaded && !prevState.heroImageLoaded)
      showContent();

    if ((curState.articleVisible && !prevState.articleVisible) ||
        curState.viewportWidth !== prevState.viewportWidth)
      chartWeight();

    if (curState.articleVisible !== prevState.articleVisible ||
        curState.svgBottom !== prevState.svgBottom ||
        curState.scroll !== prevState.scroll ||
        curState.viewportHeight !== prevState.viewportHeight)
      state({chartIsFullyInView: chartIsFullyInView()});

    if (curState.chart && curState.chart !== prevState.chart) {
      var $svgEl = $(curState.chart.svg[0][0].ownerSVGElement);
      var svgOffset = $svgEl.offset();
      state({svgBottom: $svgEl.height() + svgOffset.top});
    }

    if (curState.chartIsFullyInView && !curState.weightLineDrawn)
      animateWeightLine();

    if (!curState.headerImageIsSized && curState.heroImageLoaded)
      setHeaderImageSize();
  }

  var _state = {
    viewportHeight: window.innerHeight,
    scroll: $(window).scrollTop(),
    chartTop: $('#weight').offset().top,
    articleVisible: false,
    chartIsFullyInView: false,
    heroImageLoaded: false
  };
  var _prevState = {};
  var eventBus = $({});

  function state(newState) {
    if (arguments.length) {
      _prevState = _state;
      _state = $.extend({}, _state, newState);
      eventBus.trigger('statechange', [_state, _prevState]);
    } else {
      return _state;
    }
  }

  eventBus.on('statechange', onStateChange);

  if ($('#font-test-1').width() !== $('#font-test-2').width())
    hasImpact = true;

  $('[id^=font-test]').hide();

  $('[data-fittext]').each(function(i, el) {
    var prop = hasImpact? 'compressor-impact' : 'compressor';

    $(el).fitText($(el).data(prop));
  });

  $('[data-appear]').each(function(i, el) {
    setTimeout(function() {
      $(el).css('visibility', 'visible').trigger('appear');
    }, +$(el).data('appear') * 350);
  });

  var preload = new Image();
  preload.src = 'img/anderson-david.jpg';
  preload.onload = state.bind(null, {heroImageLoaded: true});

  $('body').on('appear', 'article', state.bind(null, {articleVisible: true}));
  $(window).on('orientationchange resize', function() {
    var h = window.innerHeight;
    var w = window.innerWidth;
    var newState = {headerImageIsSized: false};

    if (h != state().viewportHeight)
      newState.viewportHeight = h;

    if (w != state().viewportWidth)
      newState.viewportWidth = w;

    state(newState);
  });
  $('.parallax').on('scroll', function() {
    if (Math.abs(this.scrollTop - state().scroll) < 20)
      return;

    state({scroll: this.scrollTop});
  });

  onStateChange(null, _state, _prevState);
})(window);
