'use strict';


angular.module('emuwebApp')
  .directive('spectro', function ($timeout, fontScaleService) {
    return {
      templateUrl: 'views/spectro.html',
      restrict: 'E',
      replace: true,
      link: function postLink(scope, element, attrs) {
        scope.order = attrs.order;
        // select the needed DOM elements from the template
        var canvasLength = element.find('canvas').length;
        var canvas0 = element.find('canvas')[0];
        var canvas1 = element.find('canvas')[canvasLength - 1];
        // FFT default vars
        var alpha = 0.16; // default alpha for Window Function

        var context = canvas0.getContext('2d');
        var markupCtx = canvas1.getContext('2d');
        var pcmperpixel = 0;
        window.URL = window.URL || window.webkitURL;
        var devicePixelRatio = window.devicePixelRatio || 1;
        var spectroWorker = 'scripts/workers/spectroWorker.js';
        var primeWorker = new Worker(spectroWorker);
        var currentImage;

        ///////////////
        // watches

        //
        scope.$watch('vs.timelineSize', function () {
          if (!$.isEmptyObject(scope.shs)) {
            if (!$.isEmptyObject(scope.shs.wavJSO)) {
              $timeout(scope.redraw, 5);
            }
          }
        });


        scope.$watch('vs.curViewPort', function (newValue, oldValue) {
          if (!$.isEmptyObject(scope.shs)) {
            if (!$.isEmptyObject(scope.shs.wavJSO)) {
              // check for changed zoom
              if (oldValue.sS !== newValue.sS || oldValue.eS !== newValue.eS) {
                scope.redraw();
              }
              drawSpectMarkup(true);
            }
          }
        }, true);

        scope.$watch('vs.movingBoundarySample', function () {
          if (!$.isEmptyObject(scope.shs)) {
            if (!$.isEmptyObject(scope.shs.wavJSO)) {
              markupCtx.clearRect(0, 0, canvas1.width, canvas1.height);
              drawSpectMarkup();
            }
          }
        }, true);

        scope.$watch('vs.movingBoundary', function () {
          if (!$.isEmptyObject(scope.shs)) {
            if (!$.isEmptyObject(scope.shs.wavJSO)) {
              // scope.redraw();
              drawSpectMarkup(true);
            }
          }
        }, true);



        scope.$watch('vs.spectroSettings', function () {
          if (!$.isEmptyObject(scope.shs)) {
            if (!$.isEmptyObject(scope.shs.wavJSO)) {
              setupEvent();
              scope.redraw();
            }
          }
        }, true);

        ///////////////
        // bindings

        scope.redraw = function () {
          pcmpp();
          markupCtx.clearRect(0, 0, canvas1.width, canvas1.height);
          drawSpectro(scope.shs.wavJSO.Data);
        };

        function pcmpp() {
          pcmperpixel = (scope.vs.curViewPort.eS + 1 - scope.vs.curViewPort.sS) / canvas0.width;
        }

        function drawSpectMarkup(reset) {
          if (reset) {
            markupCtx.clearRect(0, 0, canvas1.width, canvas1.height);
          }

          // draw moving boundary line if moving
          scope.dhs.drawMovingBoundaryLine(markupCtx);

          // draw current viewport selected
          scope.dhs.drawCurViewPortSelected(markupCtx, false);

          // draw min max vals and name of track
          scope.dhs.drawMinMaxAndName(markupCtx, '', scope.vs.spectroSettings.rangeFrom, scope.vs.spectroSettings.rangeTo, 2);
        }

        function killSpectroRenderingThread() {
          context.fillStyle = scope.cps.vals.colors.levelColor;
          context.fillRect(0, 0, canvas0.width, canvas0.height);
          // draw current viewport selected
          scope.dhs.drawCurViewPortSelected(markupCtx, false);
          // context.font = (scope.cps.vals.font.fontPxSize + 'px' + ' ' + scope.cps.vals.font.fontType);
          // context.fillStyle = scope.cps.vals.colors.labelColor;
          var horizontalText = fontScaleService.getTextImage(context, 'rendering...', scope.cps.vals.font.fontPxSize * 0.75, scope.cps.vals.font.fontType, scope.cps.vals.colors.labelColor, true);
          context.drawImage(horizontalText, 10, 50);

          if (primeWorker !== null) {
            primeWorker.terminate();
            primeWorker = null;
          }
        }

        function setupEvent() {
          //pcmperpixel = Math.round((scope.vs.curViewPort.eS - scope.vs.curViewPort.sS) / canvas0.width);
          pcmpp();
          var imageData = context.createImageData(canvas0.width, canvas0.height);
          primeWorker.addEventListener('message', function (event) {

            if (pcmperpixel === event.data.myStep) {
              var tmp = new Uint8ClampedArray(event.data.img);
              imageData.data.set(tmp);
              context.putImageData(imageData, 0, 0);
              drawSpectMarkup();
            }
          });

        }

        function drawSpectro(buffer) {
          killSpectroRenderingThread();
          //markupCtx.clearRect(0, 0, canvas1.width, canvas1.height);
          startSpectroRenderingThread(buffer);
        }

        function startSpectroRenderingThread(buffer) {
          pcmpp();
          primeWorker = new Worker(spectroWorker);
          // var parseData = new Float32Array(buffer.subarray(scope.vs.curViewPort.sS, scope.vs.curViewPort.eS + Math.round(pcmperpixel * 20 * scope.vs.spectroSettings.windowLength)));
          var parseData;
          if (scope.vs.curViewPort.sS >= scope.vs.spectroSettings.windowLength / 2) {
            parseData = new Float32Array(buffer.subarray(scope.vs.curViewPort.sS - scope.vs.spectroSettings.windowLength / 2, scope.vs.curViewPort.eS + scope.vs.spectroSettings.windowLength)); // pass in half a window extra at the front and a full window extra at the back so everything can be drawn/calculated this also fixes alignment issue
          } else {
            parseData = new Float32Array(buffer.subarray(scope.vs.curViewPort.sS, scope.vs.curViewPort.eS + scope.vs.spectroSettings.windowLength)); // tolerate window/2 alignment issue if at beginning of file
          }
          setupEvent();
          primeWorker.postMessage({
            'cmd': 'config',
            'N': scope.vs.spectroSettings.windowLength,
            'alpha': alpha,
            'freq': scope.vs.spectroSettings.rangeTo,
            'freqLow': scope.vs.spectroSettings.rangeFrom,
            'start': scope.vs.curViewPort.sS,
            'end': scope.vs.curViewPort.eS,
            'myStep': pcmperpixel,
            'window': scope.vs.spectroSettings.window,
            'width': canvas0.width,
            'height': canvas0.height,
            'dynRangeInDB': scope.vs.spectroSettings.dynamicRange,
            'pixelRatio': devicePixelRatio,
            'sampleRate': scope.shs.wavJSO.SampleRate,
            'streamChannels': scope.shs.wavJSO.NumChannels,
            'transparency': scope.cps.vals.spectrogramSettings.transparency,
            'stream': parseData.buffer,
            'drawHeatMapColors': scope.vs.spectroSettings.drawHeatMapColors,
            'preEmphasisFilterFactor': scope.vs.spectroSettings.preEmphasisFilterFactor,
            'heatMapColorAnchors': scope.vs.spectroSettings.heatMapColorAnchors
          }, [parseData.buffer]);
          primeWorker.postMessage({
            'cmd': 'render'
          });
        }
      }
    };
  });