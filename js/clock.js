/**
 * AhmedClock TV v2 - webOS TV Clock Application
 * Timezone-aware: Main clock = GMT+6 (Dhaka)
 * World clock with city selector
 */

(function () {
  'use strict';

  // =====================
  // Configuration
  // =====================
  var CONFIG = {
    SPLASH_DURATION: 3000,
    TEMP_UPDATE_INTERVAL: 60000,
    BASE_TEMP: 32.8,
    TEMP_VARIANCE: 1.5,
    MAIN_OFFSET: 6,  // GMT+6 for Dhaka
    MONTHS: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
             'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
    DAYS: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  };

  // Available world clock cities
  var CITIES = [
    { name: 'Berlin',     offset: 2,    label: 'GMT+2' },
    // { name: 'London',     offset: 1,    label: 'GMT+1' },
    { name: 'New York',   offset: -4,   label: 'GMT-4' },
    { name: 'Los Angeles', offset: -7,  label: 'GMT-7' },
    { name: 'Dubai',      offset: 4,    label: 'GMT+4' },
    { name: 'Tokyo',      offset: 9,    label: 'GMT+9' },
    { name: 'Singapore',  offset: 8,    label: 'GMT+8' },
    { name: 'Sydney',     offset: 10,   label: 'GMT+10' },
    { name: 'Riyadh',     offset: 3,    label: 'GMT+3' },
    { name: 'Istanbul',   offset: 3,    label: 'GMT+3' },
    { name: 'Kolkata',    offset: 5.5,  label: 'GMT+5:30' },
    { name: 'Toronto',    offset: -4,   label: 'GMT-4' }
  ];

  // =====================
  // State
  // =====================
  var selectedCityIndex = 0; // Berlin default
  var currentTemp = CONFIG.BASE_TEMP;
  var animationId = null;
  var selectorVisible = false;

  // =====================
  // DOM References
  // =====================
  var splash, main;
  var hourHand, minuteHand, secondHand;
  var digitalDate, digitalTemp;
  var topBarTime;
  var tickMarksContainer;
  var worldClockCity, worldClockTime, worldClockOffset, worldClockDate;
  var worldClockChangeBtn, citySelector, cityList;

  // =====================
  // Timezone Helpers
  // =====================
  function getTimeInOffset(offsetHours) {
    var now = new Date();
    var utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utcMs + offsetHours * 3600000);
  }

  function getDhakaTime() {
    return getTimeInOffset(CONFIG.MAIN_OFFSET);
  }

  // =====================
  // Initialization
  // =====================
  function init() {
    splash = document.getElementById('splash');
    main = document.getElementById('main');
    hourHand = document.getElementById('hourHand');
    minuteHand = document.getElementById('minuteHand');
    secondHand = document.getElementById('secondHand');
    digitalDate = document.getElementById('digitalDate');
    digitalTemp = document.getElementById('digitalTemp');
    topBarTime = document.getElementById('topBarTime');
    tickMarksContainer = document.getElementById('tickMarks');

    worldClockCity = document.getElementById('worldClockCity');
    worldClockTime = document.getElementById('worldClockTime');
    worldClockOffset = document.getElementById('worldClockOffset');
    worldClockDate = document.getElementById('worldClockDate');
    worldClockChangeBtn = document.getElementById('worldClockChangeBtn');
    citySelector = document.getElementById('citySelector');
    cityList = document.getElementById('cityList');

    generateTickMarks();
    buildCityList();
    setupCitySelector();
    showSplash();
  }

  // =====================
  // Tick Mark Generation
  // =====================
  function generateTickMarks() {
    var faceSize = 812; // 860 - 2*24 padding
    var centerX = faceSize / 2;
    var centerY = faceSize / 2;
    var outerRadius = faceSize / 2 - 16;

    for (var i = 0; i < 60; i++) {
      var angle = (i * 6 - 90) * (Math.PI / 180);
      var isMajor = (i % 5 === 0);
      var tickLength = isMajor ? 24 : 12;
      var tickWidth = isMajor ? 3 : 1.2;

      var outerX = centerX + outerRadius * Math.cos(angle);
      var outerY = centerY + outerRadius * Math.sin(angle);
      var innerX = centerX + (outerRadius - tickLength) * Math.cos(angle);
      var innerY = centerY + (outerRadius - tickLength) * Math.sin(angle);

      var dx = outerX - innerX;
      var dy = outerY - innerY;
      var length = Math.sqrt(dx * dx + dy * dy);
      var midX = (outerX + innerX) / 2;
      var midY = (outerY + innerY) / 2;
      var rotAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

      var tick = document.createElement('div');
      tick.style.position = 'absolute';
      tick.style.left = midX + 'px';
      tick.style.top = midY + 'px';
      tick.style.width = tickWidth + 'px';
      tick.style.height = length + 'px';
      tick.style.transform = 'translate(-50%, -50%) rotate(' + rotAngle + 'deg)';
      tick.style.background = isMajor ? '#2a2520' : '#9a9388';
      tick.style.borderRadius = '1px';
      tick.style.zIndex = '5';

      tickMarksContainer.appendChild(tick);
    }
  }

  // =====================
  // City List & Selector
  // =====================
  function buildCityList() {
    cityList.innerHTML = '';
    for (var i = 0; i < CITIES.length; i++) {
      var city = CITIES[i];
      var opt = document.createElement('div');
      opt.className = 'city-option' + (i === selectedCityIndex ? ' selected' : '');
      opt.setAttribute('tabindex', '0');
      opt.setAttribute('data-index', i);
      opt.innerHTML =
        '<span class="city-option-name">' + city.name + '</span>' +
        '<span class="city-option-offset">' + city.label + '</span>';
      cityList.appendChild(opt);
    }
  }

  function setupCitySelector() {
    worldClockChangeBtn.addEventListener('click', function () {
      selectorVisible = !selectorVisible;
      if (selectorVisible) {
        citySelector.classList.remove('hidden');
      } else {
        citySelector.classList.add('hidden');
      }
    });

    cityList.addEventListener('click', function (e) {
      var option = e.target.closest('.city-option');
      if (!option) return;
      var idx = parseInt(option.getAttribute('data-index'), 10);
      selectedCityIndex = idx;
      selectorVisible = false;
      citySelector.classList.add('hidden');
      buildCityList();
      updateWorldClock();
    });

    // Keyboard support for TV remote
    cityList.addEventListener('keydown', function (e) {
      if (e.keyCode === 13 || e.keyCode === 32) { // Enter or Space
        var option = e.target.closest('.city-option');
        if (!option) return;
        var idx = parseInt(option.getAttribute('data-index'), 10);
        selectedCityIndex = idx;
        selectorVisible = false;
        citySelector.classList.add('hidden');
        buildCityList();
        updateWorldClock();
      }
    });
  }

  // =====================
  // Splash Screen
  // =====================
  function showSplash() {
    setTimeout(function () {
      splash.style.opacity = '0';
      setTimeout(function () {
        splash.classList.add('hidden');
        main.classList.remove('hidden');
        startClock();
      }, 800);
    }, CONFIG.SPLASH_DURATION);
  }

  // =====================
  // Clock Engine
  // =====================
  function startClock() {
    updateClock();
    updateDigitalPanel();
    updateTopBar();
    updateWorldClock();
    updateTemperature();

    function tick() {
      updateClock();
      animationId = requestAnimationFrame(tick);
    }
    animationId = requestAnimationFrame(tick);

    setInterval(function () {
      updateDigitalPanel();
      updateTopBar();
      updateWorldClock();
    }, 1000);

    setInterval(updateTemperature, CONFIG.TEMP_UPDATE_INTERVAL);
  }

  function updateClock() {
    var dhaka = getDhakaTime();
    var hours = dhaka.getHours() % 12;
    var minutes = dhaka.getMinutes();
    var seconds = dhaka.getSeconds();
    var milliseconds = dhaka.getMilliseconds();

    var secondAngle = (seconds + milliseconds / 1000) * 6;
    var minuteAngle = (minutes + seconds / 60) * 6;
    var hourAngle = (hours + minutes / 60) * 30;

    secondHand.style.transform = 'rotate(' + secondAngle + 'deg)';
    minuteHand.style.transform = 'rotate(' + minuteAngle + 'deg)';
    hourHand.style.transform = 'rotate(' + hourAngle + 'deg)';
  }

  // =====================
  // Top Bar Time (Dhaka, 12h format)
  // =====================
  function updateTopBar() {
    var dhaka = getDhakaTime();
    var h = dhaka.getHours();
    var m = dhaka.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    var mStr = m < 10 ? '0' + m : '' + m;
    topBarTime.textContent = h12 + ':' + mStr + ' ' + ampm;
  }

  // =====================
  // Digital Panel (Dhaka timezone)
  // =====================
  function updateDigitalPanel() {
    var dhaka = getDhakaTime();
    var month = CONFIG.MONTHS[dhaka.getMonth()];
    var date = dhaka.getDate();
    var day = CONFIG.DAYS[dhaka.getDay()];
    var dateStr = date < 10 ? '0' + date : '' + date;
    digitalDate.textContent = month + ' ' + dateStr + ' ' + day;
  }

  // =====================
  // World Clock
  // =====================
  function updateWorldClock() {
    var city = CITIES[selectedCityIndex];
    var t = getTimeInOffset(city.offset);

    var h = t.getHours();
    var m = t.getMinutes();
    var hStr = h < 10 ? '0' + h : '' + h;
    var mStr = m < 10 ? '0' + m : '' + m;

    var month = CONFIG.MONTHS[t.getMonth()];
    var date = t.getDate();
    var day = CONFIG.DAYS[t.getDay()];
    var dateStr = date < 10 ? '0' + date : '' + date;

    worldClockCity.textContent = city.name;
    worldClockTime.textContent = hStr + ':' + mStr;
    worldClockOffset.textContent = city.label;
    worldClockDate.textContent = month + ' ' + dateStr + ' ' + day;
  }

  // =====================
  // Temperature (simulated)
  // =====================
  function updateTemperature() {
    var dhaka = getDhakaTime();
    var hour = dhaka.getHours();
    var baseAdj = 0;

    if (hour >= 6 && hour < 10) {
      baseAdj = -2 + (hour - 6) * 0.8;
    } else if (hour >= 10 && hour < 15) {
      baseAdj = 1.5 + Math.random() * 0.5;
    } else if (hour >= 15 && hour < 19) {
      baseAdj = 1.0 - (hour - 15) * 0.4;
    } else if (hour >= 19 && hour < 23) {
      baseAdj = -1.0 - (hour - 19) * 0.3;
    } else {
      baseAdj = -2.5 + Math.random() * 0.5;
    }

    currentTemp = CONFIG.BASE_TEMP + baseAdj + (Math.random() - 0.5) * CONFIG.TEMP_VARIANCE;
    digitalTemp.textContent = currentTemp.toFixed(1) + '\u00B0C';
  }

  // =====================
  // webOS TV Lifecycle
  // =====================
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    } else {
      if (!animationId) {
        function tick() {
          updateClock();
          animationId = requestAnimationFrame(tick);
        }
        animationId = requestAnimationFrame(tick);
      }
    }
  });

  // Handle webOS back key + remote navigation
  document.addEventListener('keydown', function (e) {
    if (e.keyCode === 461) { // Back key on LG remote
      if (selectorVisible) {
        selectorVisible = false;
        citySelector.classList.add('hidden');
      } else {
        if (typeof window.webOS !== 'undefined' && window.webOS.platformBack) {
          window.webOS.platformBack();
        } else {
          window.close();
        }
      }
    }
  });

  // =====================
  // Start
  // =====================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
