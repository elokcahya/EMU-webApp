'use strict';

angular.module('emuwebApp')
	.service('AnagestService', function AnagestService($q, $log, viewState, LevelService, LinkService, ConfigProviderService, Ssffdataservice, ArrayHelperService, modalService, HistoryService, DataService) {
		// shared service object
		var sServObj = {};

		// defer object 
		var defer;

		/**
		 *
		 */
		sServObj.insertAnagestEvents = function () {

			var defer = $q.defer();

			// precheck if there are items in selection
			var itemInSel = viewState.getItemsInSelection(DataService.data.levels);
			if (itemInSel.length !== 0) {
				modalService.open('views/error.html', 'There are already events in the selected area! This is not permitted...').then(function () {
					defer.reject();
				});
				return defer;
			}

			// vertical position signal
			var trackName = ConfigProviderService.getLevelDefinition(viewState.getcurClickLevelName()).anagestConfig.verticalPosSsffTrackName;
			var tr = ConfigProviderService.getSsffTrackConfig(trackName);
			var col = Ssffdataservice.getColumnOfTrack(tr.name, tr.columnName);

			var sRaSt = Ssffdataservice.getSampleRateAndStartTimeOfTrack(tr.name);

			// velocity signal
			var vTrackName = ConfigProviderService.getLevelDefinition(viewState.getcurClickLevelName()).anagestConfig.velocitySsffTrackName;
			var vTr = ConfigProviderService.getSsffTrackConfig(vTrackName);
			var vCol = Ssffdataservice.getColumnOfTrack(vTr.name, vTr.columnName);

			if (col.length !== 1 || vCol.length !== 1) {
				modalService.open('views/error.html', 'UPS... the column length of of one of the tracks is != 1 this means something is badly configured in the DB!!!').then(function () {
					defer.reject();
				});
				return defer;
			}
			// flatten columns
			var flatColVals = ArrayHelperService.flattenArrayOfArray(col.values);
			var flatVcolVals = ArrayHelperService.flattenArrayOfArray(vCol.values);

			/////////////////////////////////////////

			var gdat = [NaN, NaN]; // gesture on- and offset
			var vdat = [NaN, NaN]; // peak velocities
			var ndat = [NaN, NaN]; // plateatu/nucleus on- and offset
			var cdat = [NaN]; // center


			// Looking for peak or for valley?
			if (ConfigProviderService.getLevelDefinition(viewState.getcurClickLevelName()).anagestConfig.multiplicationFactor === -1) {
				var lookingForPeak = false;
			} else {
				var lookingForPeak = true;
			} /// What about (invalid cases) where the config is != 1 and != -1?


			// easiest way to handle non-tangential signals (and has no effect on tangential signals)
			flatVcolVals = ArrayHelperService.convertToAbsValues(flatVcolVals);

			// selected column samples
			var startTimeSel = viewState.getSelectedStartTime();
			var endTimeSel = viewState.getSelectedEndTime();
			var colStartSampleNr = Math.round(startTimeSel * sRaSt.sampleRate + sRaSt.startTime);
			var colEndSampleNr = Math.round(endTimeSel * sRaSt.sampleRate + sRaSt.startTime);

			var nrOfSamples = colEndSampleNr - colStartSampleNr;

			var selCol = flatColVals.slice(colStartSampleNr, colStartSampleNr + nrOfSamples);
			var selVCol = flatVcolVals.slice(colStartSampleNr, colStartSampleNr + nrOfSamples);


			// maxConstr
			if (lookingForPeak) {
				var maxVerticalPos = ArrayHelperService.findMinMax(selCol, 'max');
				cdat[0] = maxVerticalPos.idx;
			} else {
				var maxVerticalPos = ArrayHelperService.findMinMax(selCol, 'min');
				cdat[0] = maxVerticalPos.idx;
			}

			// max vel before max constriction
			var maxVelBeforeMaxConstr = ArrayHelperService.findMinMax(selVCol.slice(0, cdat[0] + 1), 'max');
			vdat[0] = maxVelBeforeMaxConstr.idx;

			// min vel before max vel
			var minVelBeforeMaxVel = ArrayHelperService.findMinMax(selVCol.slice(0, vdat[0] + 1), 'min');

			// gesture onset
			$log.info('Looking for gesture onset');


			sServObj.interactiveFindThresholds(selVCol.slice(0, vdat[0] + 1), minVelBeforeMaxVel.val, maxVelBeforeMaxConstr.val, ConfigProviderService.getLevelDefinition(viewState.getcurClickLevelName()).anagestConfig.threshold, 1, 'Looking for gesture onset').then(function (resp) {
				// keyboard;
				var on20 = resp;
				gdat[0] = on20;

				// min vel between max vel 1 and max constriction
				var minVelBetwMaxVel1maxConstr = ArrayHelperService.findMinMax(selVCol.slice(vdat[0], cdat[0] + 1), 'min');

				var minp = minVelBetwMaxVel1maxConstr.idx + vdat[0];

				// nucleus onset
				$log.info('Looking for nucleus onset');
				sServObj.interactiveFindThresholds(selVCol.slice(vdat[0], minp + 1), minVelBetwMaxVel1maxConstr.val, maxVelBeforeMaxConstr.val, ConfigProviderService.getLevelDefinition(viewState.getcurClickLevelName()).anagestConfig.threshold, -1, 'Looking for nucleus onset').then(function (resp) {
					var off20 = resp;
					ndat[0] = off20 + vdat[0];

					// max vel after max constriction
					var maxVelAfterMaxConstr = ArrayHelperService.findMinMax(selVCol.slice(cdat[0]), 'max'); // max vel before max constriction
					vdat[1] = maxVelAfterMaxConstr.idx + cdat[0];


					// minimum between max constriction and max vel after constriction
					var minBetwMaxConstrMaxVelConstr = ArrayHelperService.findMinMax(selVCol.slice(cdat[0], vdat[1] + 1), 'min');

					minp = minBetwMaxConstrMaxVelConstr.idx + cdat[0];

					// nucleus offset
					$log.info('Looking for nucleus offset');
					sServObj.interactiveFindThresholds(selVCol.slice(minp, vdat[1] + 1), minBetwMaxConstrMaxVelConstr.val, maxVelAfterMaxConstr.val, ConfigProviderService.getLevelDefinition(viewState.getcurClickLevelName()).anagestConfig.threshold, 1, 'Looking for nucleus offset').then(function (resp) {
						var on20 = resp;
						ndat[1] = on20 + minp;

						// minimum velocity after max vel after constriction
						var minVelAfterMaxVelAfterConstr = ArrayHelperService.findMinMax(selVCol.slice(vdat[1]), 'min');

						minp = minVelAfterMaxVelAfterConstr.idx + vdat[1];
						// gesture offset

						$log.info('Looking for gesture offset');
						sServObj.interactiveFindThresholds(selVCol.slice(vdat[1], minp + 1), minVelAfterMaxVelAfterConstr.val, maxVelAfterMaxConstr.val, ConfigProviderService.getLevelDefinition(viewState.getcurClickLevelName()).anagestConfig.threshold, -1, 'Looking for gesture offset').then(function (resp) {
							var off20 = resp;
							gdat[1] = off20 + vdat[1];
							// insert points
							// var insPoint;
							var curLabel;

							// console.log(gdat)
							gdat[0] = Ssffdataservice.calculateSamplePosInVP(colStartSampleNr + gdat[0], sRaSt.sampleRate, sRaSt.startTime);
							gdat[1] = Ssffdataservice.calculateSamplePosInVP(colStartSampleNr + gdat[1], sRaSt.sampleRate, sRaSt.startTime);
							curLabel = ConfigProviderService.getLevelDefinition(viewState.getcurClickLevelName()).anagestConfig.gestureOnOffsetLabels[0];
							var gdat0insPoint = LevelService.insertEvent(viewState.getcurClickLevelName(), gdat[0], curLabel);
							HistoryService.updateCurChangeObj({
								'type': 'ANNOT',
								'action': 'INSERTEVENT',
								'name': viewState.getcurClickLevelName(),
								'start': gdat[0],
								'id': gdat0insPoint.id,
								'pointName': curLabel
							});

							curLabel = ConfigProviderService.getLevelDefinition(viewState.getcurClickLevelName()).anagestConfig.gestureOnOffsetLabels[1];
							var gdat1insPoint = LevelService.insertEvent(viewState.getcurClickLevelName(), gdat[1], curLabel);
							HistoryService.updateCurChangeObj({
								'type': 'ANNOT',
								'action': 'INSERTEVENT',
								'name': viewState.getcurClickLevelName(),
								'start': gdat[1],
								'id': gdat1insPoint.id,
								'pointName': curLabel
							});

							// console.log(vdat);
							vdat[0] = Ssffdataservice.calculateSamplePosInVP(colStartSampleNr + vdat[0], sRaSt.sampleRate, sRaSt.startTime);
							vdat[1] = Ssffdataservice.calculateSamplePosInVP(colStartSampleNr + vdat[1], sRaSt.sampleRate, sRaSt.startTime);
							curLabel = ConfigProviderService.getLevelDefinition(viewState.getcurClickLevelName()).anagestConfig.maxVelocityOnOffsetLabels[0];
							var vdat0insPoint = LevelService.insertEvent(viewState.getcurClickLevelName(), vdat[0], curLabel);
							HistoryService.updateCurChangeObj({
								'type': 'ANNOT',
								'action': 'INSERTEVENT',
								'name': viewState.getcurClickLevelName(),
								'start': vdat[0],
								'id': vdat0insPoint.id,
								'pointName': curLabel
							});

							curLabel = ConfigProviderService.getLevelDefinition(viewState.getcurClickLevelName()).anagestConfig.maxVelocityOnOffsetLabels[1];
							var vdat1insPoint = LevelService.insertEvent(viewState.getcurClickLevelName(), vdat[1], curLabel);
							HistoryService.updateCurChangeObj({
								'type': 'ANNOT',
								'action': 'INSERTEVENT',
								'name': viewState.getcurClickLevelName(),
								'start': vdat[1],
								'id': vdat1insPoint.id,
								'pointName': curLabel
							});

							// console.log(ndat);
							ndat[0] = Ssffdataservice.calculateSamplePosInVP(colStartSampleNr + ndat[0], sRaSt.sampleRate, sRaSt.startTime);
							ndat[1] = Ssffdataservice.calculateSamplePosInVP(colStartSampleNr + ndat[1], sRaSt.sampleRate, sRaSt.startTime);
							curLabel = ConfigProviderService.getLevelDefinition(viewState.getcurClickLevelName()).anagestConfig.constrictionPlateauBeginEndLabels[0];
							var ndat0insPoint = LevelService.insertEvent(viewState.getcurClickLevelName(), ndat[0], curLabel);
							HistoryService.updateCurChangeObj({
								'type': 'ANNOT',
								'action': 'INSERTEVENT',
								'name': viewState.getcurClickLevelName(),
								'start': ndat[0],
								'id': ndat0insPoint.id,
								'pointName': curLabel
							});

							curLabel = ConfigProviderService.getLevelDefinition(viewState.getcurClickLevelName()).anagestConfig.constrictionPlateauBeginEndLabels[1];
							var ndat1insPoint = LevelService.insertEvent(viewState.getcurClickLevelName(), ndat[1], curLabel);
							HistoryService.updateCurChangeObj({
								'type': 'ANNOT',
								'action': 'INSERTEVENT',
								'name': viewState.getcurClickLevelName(),
								'start': ndat[1],
								'id': ndat1insPoint.id,
								'pointName': curLabel
							});

							// console.log(cdat);
							cdat[0] = Ssffdataservice.calculateSamplePosInVP(colStartSampleNr + cdat[0], sRaSt.sampleRate, sRaSt.startTime);
							curLabel = ConfigProviderService.getLevelDefinition(viewState.getcurClickLevelName()).anagestConfig.maxConstrictionLabel;
							var cdat0insPoint = LevelService.insertEvent(viewState.getcurClickLevelName(), cdat[0], curLabel);
							HistoryService.updateCurChangeObj({
								'type': 'ANNOT',
								'action': 'INSERTEVENT',
								'name': viewState.getcurClickLevelName(),
								'start': cdat[0],
								'id': cdat0insPoint.id,
								'pointName': curLabel
							});

							var linkLevelName = ConfigProviderService.getLevelDefinition(viewState.getcurClickLevelName()).anagestConfig.autoLinkLevelName;
							var linkLevelDetails = LevelService.getLevelDetails(linkLevelName);
							var linkLevelLabels = LevelService.getAllLabelsOfLevel(linkLevelDetails);

							modalService.open('views/SelectLabelModal.html', linkLevelLabels, undefined, true).then(function (itemIdx) {
								if (itemIdx !== false) {
									var childIDs = [
										gdat0insPoint.id, gdat1insPoint.id, vdat0insPoint.id, vdat1insPoint.id,
										ndat0insPoint.id, ndat1insPoint.id, cdat0insPoint.id
									];
									LinkService.insertLinksTo(linkLevelDetails.items[itemIdx].id, childIDs);
									HistoryService.updateCurChangeObj({
										'type': 'ANNOT',
										'action': 'INSERTLINKSTO',
										'name': linkLevelDetails.name,
										'parentID': linkLevelDetails.items[itemIdx].id,
										'childIDs': childIDs
									});
									HistoryService.addCurChangeObjToUndoStack();
								}
							});

							defer.resolve();
						});
					});
				});

			}, function () {
			});
			return defer.promise;
		};

		/**
		 * find threshold in array (an adapted reimplementation of findth.m by
		 * Phil Hoole Version 17.6.2006)
		 *
		 * @param x
		 * @param minVal
		 * @param maxVal
		 * @param threshold
		 * @param direction
		 * @param descriptions describes the task
		 * @returns promise that resolves to threshold value
		 */
		sServObj.interactiveFindThresholds = function (x, minVal, maxVal, threshold, direction, description) {
			// console.log('interactiveFindThresholds');
			var i;

			var thdat = minVal + (maxVal - minVal) * threshold;

			var thdir = direction;

			thdat = thdat * thdir;


			var xx = ArrayHelperService.multiplyEachElement(x, thdir); // handle positive/neg.

			var lx = xx.length;
			var xsh = xx.slice(1, lx);
			var loguk = 0;
			var higuk = lx - 1;

			// vz=find((xsh>=thdat)&(xx(1:(lx-1))<thdat));
			var vz = [];
			for (i = 0; i < xx.length; i++) {
				if ((xsh[i] >= thdat) && (xx[i] < thdat)) {
					vz.push(i);
				}
			}

			// anavv=find(vz>=loguk & vz<=higuk);
			var anavv = [];
			for (i = 0; i < vz.length; i++) {
				if ((vz[i] >= loguk) && vz[i] <= higuk) {
					anavv.push(i);
				}
			}

			if (anavv.length > 1) {
				defer = $q.defer();
				var infos = {};
				infos.description = description;
				infos.options = [];
				infos.y = xx;
				infos.minVal = minVal;
				infos.maxVal = maxVal;
				infos.threshold = threshold;
				for (i = 0; i < vz.length; i++) {
					infos.options.push({
						'thresholdIdx': vz[i],
						'thresholdValue': xx[i],
					});
				}

				modalService.open('views/SelectThresholdModal.html', infos, undefined, true).then(function (resp) {
					// console.log(resp);
					var ap = vz[anavv[resp]];
					ap = ArrayHelperService.interp2points(xx[ap], ap, xx[ap + 1], ap + 1, thdat);
					defer.resolve(ap);
				});
				return defer.promise;
			} else if (anavv.length === 0) {
				defer = $q.defer();
				modalService.open('views/error.html', 'Could not find any values that step over the threshold!!').then(function () {
					defer.reject('Could not find any values that step over the threshold!!');
				});
				return defer.promise;
			} else {
				defer = $q.defer();
				var ap = vz[anavv[0]];
				ap = ArrayHelperService.interp2points(xx[ap], ap, xx[ap + 1], ap + 1, thdat);
				defer.resolve(ap);
				return defer.promise;
			}

		};

		return sServObj;
	});
