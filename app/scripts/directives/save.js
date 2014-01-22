'use strict';

angular.module('emulvcApp')
  .directive('save', function (dialogService, Espsparserservice) {
    return {
      restrict: 'A',
      link: function (scope, element) {
        var id = scope.this.level.LevelName;

        element.bind('click', function () {
          scope.vs.setcurClickLevelName(id);
          dialogService.openExport('views/export.html', 'ExportCtrl', Espsparserservice.toESPS(scope.this.level),'tier.txt');
        });

      }
    };
  });