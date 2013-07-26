(function(){

	var _hitList,
		_prevMove = {},
		_animatedItems = [],
		_animatedPeople = [],
		_pfx = ["webkit", "moz", "MS", "o", ""];

	var items = $game.items = {
		itemKeys: null,
		peopleKeys: null,
		itemData: null,
		peopleData: null,
		showingBio : false,
		ready: false,

		init: function() {
			_loadData();
			items.itemKeys = Object.keys(items.itemData);
			items.peopleKeys = Object.keys(items.peopleData);
			_setupItems(0); //this triggers setupPeple when done
		},

		setZIndex: function(input) {
			var minX = Math.min(input.x,$game.player.x),
				minY = Math.min(input.y,$game.player.y),
				playerBottom = $game.player.y + $game.player.h;

			if(DEV_MODE) {
				$('.devDirtyBound').remove();
				var d = document.createElement('div');
				d.setAttribute('class', 'devDirtyBound');
				$(d).css({
					position: 'absolute',
					top: minY,
					left: minX,
					width: input.w,
					height: input.h
				});	
				$GAMEBOARD.append(d);
			}
			//reset hit list to empty and build it up, these are the items we will check for collision during walk
			_hitList = [];
			//items
			for(var i = 0; i < items.itemKeys.length; i++) {
				var item = items.itemData[items.itemKeys[i]];
				//see if it will be in range of the new walk
				if ((minX + input.w >= item.x) && (minX <= item.x + item.w) && (minY + input.h >= item.y) && (minY <= item.y + item.h)) {
					item.flipped = false;
					item.kind = 'item';
					_hitList.push(item);
					//check to see which side the player is on (above or below)
					if(playerBottom < item.bottom) {
						//above
						item.selector.addClass('fgItem');
						item.side = -1;
					} else {
						//below
						item.selector.removeClass('fgItem');
						item.side = 1;
					}
				}
			}
			//people
			for(var j = 0; j < items.peopleKeys.length; j++) {
				var person = items.peopleData[items.peopleKeys[j]];
				if ((minX + input.w >= person.x) && (minX <= person.x + person.w) && (minY + input.h >= person.y) && (minY <= person.y + person.h)) {
					person.flipped = false;
					person.kind = 'person';
					_hitList.push(person);
					//check to see which side the player is on (above or below)
					if(playerBottom < person.bottom) {
						person.selector.addClass('fgPerson');
						person.side = -1;
					} else {
						person.selector.removeClass('fgPerson');
						person.side = 1;
					}
				}
			}
		},

		hitTest: function() {
			//only test if moving...
			if($game.player.inTransit) {
				//must pull the current position (yuck)
				var tempX = parseFloat($game.player.otherSelector.style.left),
					tempY = parseFloat($game.player.otherSelector.style.top),
					bottomY = tempY + $game.player.h;
				
				for(var h = 0; h < _hitList.length; h++) {
					var other = _hitList[h];
					//see if player has crossed Y plane and we need to switch zindex
					var yDiff = bottomY - other.bottom,
						diff =  yDiff < 0 ? -1 : 1;
					//check for collision (must do first so we don't flip if jump pos back)
					if ((tempX + $game.player.w >= other.x) && (tempX <= other.x + other.w) && (Math.abs(yDiff) < HEIGHT_BUFFER)) {
						//return prev position doubled so it doesn't overlap for next move
						var rateX = tempX - _prevMove.x,
							rateY = tempY - _prevMove.y;
						_prevMove.x -= rateX;
						_prevMove.y -= rateY;
						$game.player.stopMove(_prevMove);
						break;
					}
					if(diff !== other.side) {
						if(!other.flipped) {
							other.flipped = true;
							if(other.kind === 'item') {
								other.selector.toggleClass('fgItem');
							} else if(other.kind === 'person') {
								other.selector.toggleClass('fgPerson');
							}
						}
					}
				}
				//store the last step so we can place player there for no conflicts on next move
				_prevMove.x = tempX;
				_prevMove.y = tempY;

				requestAnimationFrame(items.hitTest);
			}
		},

		clickedItem: function(key, el) {
			var item = items.itemData[key];
			if(item.action) {
				item.action(el);
			}
			if(item.message) {
				$game.showMessage({el: el, message: item.message});	
			}
		},

		clickedPerson: function(key, el) {
			var person = items.peopleData[key];
			//see if the user has clicked them first
			if($game.user.game.people[key]) {
				//show status
				if(person.status) {
					$game.showMessage({el: el, message: person.status});	
				}
			} else {
				//show bio card
				$('#bioCard img').attr('src', 'img/people/bio/' + key + '.png');
				$('#bioCard .bioName span').text(person.fullName);
				$('#bioCard .bioTitle span').text(person.jobTitle);
				$('#bioCard .bioAbout span').text(person.about);

				$('#bioCard').show();
				setTimeout(function() {
					items.showingBio = true;
				}, 17);
				$game.user.game.people[key] = {bio: true};
				$game.updateStorage();
			}
		},

		updateItemAnimations: function() {
			for(var a = 0; a < _animatedItems.length; a++) {
				var item = items.itemData[_animatedItems[a]];
				_animateItem(item);
			}
			for(var a = 0; a < _animatedPeople.length; a++) {
				var item = items.peopleData[_animatedPeople[a]];
				_animateItem(item);
			}
		}
	};
	items.init();

	//private functions
	function _setupItems(index) {
		var key = items.itemKeys[index],
			info = items.itemData[key],
			item = document.createElement('div'),
			img = new Image();
		
		img.onload = function() {
			//set the background image and append
			item.setAttribute('id', key);
			item.setAttribute('class', info.class + ' item'); 
			item.setAttribute('data-key', key);
			var divWidth, divHeight;

			//set size, based on if it is animated or not
			if(info.frames) {
				//if animted, add it to animation list
				_animatedItems.push(key);
				info.curFrame = Math.floor(Math.random() * info.frames);
				divWidth = Math.floor(img.width / info.frames);
			} else {
				divWidth = img.width;
				divHeight = img.height;
			}
			//we are animating with css instead of spritesheet
			if(info.css) {
				divWidth = info.css.w;
				divHeight = info.css.h;
			}
			$(item).css({
				position: 'absolute',
				top: info.y,
				left: info.x,
				width: divWidth,
				height: divHeight,
				backgroundImage: 'url(' + img.src + ')'
			});
			$GAMEBOARD.append(item);
			if(info.css) {
				info.css.init();
			}
			info.selector = $('#' + key);
			info.w = divWidth;
			info.h = divHeight;
			info.bottom = info.y + info.h;
			index++;
			if(index < items.itemKeys.length) {
				_setupItems(index);
			} else {
				_setupPeople(0);
			}
		}
		img.src = '/img/items/' + info.class + '.png';
	}

	function _setupPeople(index) {
		var key = items.peopleKeys[index],
			info = items.peopleData[key],
			item = document.createElement('div'),
			img = new Image();

		img.onload = function() {
			//set the background image and append
			item.setAttribute('id', key);
			item.setAttribute('class', 'person');
			item.setAttribute('data-key', key);
			var divWidth;
			//set size, based on if it is animated or not
			if(info.frames) {
				//if animted, add it to animation list
				_animatedPeople.push(key);
				info.curFrame = Math.floor(Math.random() * info.frames);
				divWidth = Math.floor(img.width / info.frames);
			} else {
				divWidth = img.width;
			}
			$(item).css({
				position: 'absolute',
				top: info.y,
				left: info.x,
				width: divWidth,
				height: img.height,
				backgroundImage: 'url(' + img.src + ')'
			});
			$GAMEBOARD.append(item);
			info.selector = $('#' + key);
			info.w = divWidth;
			info.h = img.height;
			info.bottom = info.y + info.h;
			index++;
			if(index < items.peopleKeys.length) {
				_setupPeople(index);
			} else {
				_preloadBioCards(0);
			}
		}
		img.src = 'img/people/' + key + '.png';
	}

	function _preloadBioCards(index) {		
		var img = new Image();
		img.onload = function() {

			index++;
			if(index < items.peopleKeys.length) {
				_setupPeople(index);
			} else {
				_loadPeopleInfo(true); //set to null for google doc
			}
		}
		var person = items.peopleKeys[index];
		img.src = 'img/people/bio/' + person + '.png';
	}

	function _loadData() {
		items.itemData = {
			'marker2': {
				class: 'marker2',
				x: 1050,
				y: 173,
				message: 'Blue marker, I choose you!',
				action: function() {
					$game.whiteboard.setColor('#0000ff');
				}
			},
			'marker1': {
				class: 'marker1',
				x: 1100,
				y: 169,
				message: 'Red marker, go!',
				action: function() {
					$game.whiteboard.setColor('#ff0000');
				}
			},
			'eraser': {
				class: 'eraser',
				x: 850,
				y: 173,
				message: 'I feel just like Sisyphus...',
				action: function() {
					if($game.whiteboard.drawingExists) {
						$game.whiteboard.saveDrawing();
					}
					$game.whiteboard.clearBoard();
				}
			},
			'boombox': {
				class: 'boombox',
				x: 700,
				y: 450,
				// message: 'booooombox',
				action: function(el) { $game.audio.toggleMusic(el); }
			},
			'cloud0': {
				class: 'cloud0',
				x: 0,
				y: 75,
				css: {
					w: 52,
					h: 44,
					init: function() {
						var anim = document.getElementById('cloud0');
						_prefixedEvent(anim, "AnimationIteration", _animationListener);
						$(anim).css('background-image', 'url(/img/items/cloud0.png)');
					},
					imageIndex: 0,
					numImages: 3,
					updateImage: function() {
						// $('#cloud1').css('background-position', '-255px 44px');
						this.imageIndex++;
						if(this.imageIndex >= this.numImages) {
							this.imageIndex = 0;
							//update bg
						}
						var url = 'url(img/items/cloud' + this.imageIndex + '.png)';
						$('#cloud0').css({
							backgroundImage: url
						});
					}
				}
			},
			'cloud1': {
				class: 'cloud1',
				x: 449,
				y: 75,
				css: {
					w: 106,
					h: 44,
					init: function() {
						var anim = document.getElementById('cloud1');
						_prefixedEvent(anim, "AnimationIteration", _animationListener);
						$(anim).css('background-image', 'url(/img/items/cloud0.png)');
					},
					imageIndex: 0,
					numImages: 3,
					updateImage: function() {
						// $('#cloud1').css('background-position', '-255px 44px');
						this.imageIndex++;
						if(this.imageIndex >= this.numImages) {
							this.imageIndex = 0;
							//update bg
						}
						var url = 'url(img/items/cloud' + this.imageIndex + '.png)';
						$('#cloud1').css({
							backgroundImage: url
						});
					}
				}
			},
			'cloud2': {
				class: 'cloud2',
				x: 1447,
				y: 75,
				css: {
					w: 106,
					h: 44,
					init: function() {
						var anim = document.getElementById('cloud2');
						_prefixedEvent(anim, "AnimationIteration", _animationListener);
						$(anim).css('background-image', 'url(/img/items/cloud0.png)');
					},
					imageIndex: 0,
					numImages: 3,
					updateImage: function() {
						// $('#cloud2').css('background-position', '-255px 44px');
						this.imageIndex++;
						if(this.imageIndex >= this.numImages) {
							this.imageIndex = 0;
							//update bg
						}
						var url = 'url(img/items/cloud' + this.imageIndex + '.png)';
						$('#cloud2').css({
							backgroundImage: url
						});
					}
				}
			},
			'cloud3': {
				class: 'cloud2',
				x: 1948,
				y: 75,
				css: {
					w: 52,
					h: 44,
					init: function() {
						var anim = document.getElementById('cloud3');
						_prefixedEvent(anim, "AnimationIteration", _animationListener);
						$(anim).css('background-image', 'url(/img/items/cloud0.png)');
					},
					imageIndex: 0,
					numImages: 3,
					updateImage: function() {
						// $('#cloud1').css('background-position', '-255px 44px');
						this.imageIndex++;
						if(this.imageIndex >= this.numImages) {
							this.imageIndex = 0;
							//update bg
						}
						var url = 'url(img/items/cloud' + this.imageIndex + '.png)';
						$('#cloud3').css({
							backgroundImage: url
						});
					}
				}
			},
		};

		items.peopleData = {
			'steve': {
				x: 100,
				y: 300,
				frames: 8,
				animation: [4,5,6,7,0,1,2,3,6,7,5,6,5,0,1,4,5,6,7,6,5,4,0,1,2,1,0,6,5,7,4,6,5,4],
				fullName: 'Steve Walter',
				jobTitle: 'Lab Coordinator',
				about: 'I love puppies, frogs, bananas, working at the EGL, brewing beer with friends, drinking that beer with friends, and gnomes.'
			}
		};
	}

	function _loadPeopleInfo(backupData) {
		var rawData;
		if(backupData) {
			rawData = new Miso.Dataset({
				url: '/data/backup.csv',
				delimiter: ','
			});
		} else {
			rawData = new Miso.Dataset({
				importer : Miso.Dataset.Importers.GoogleSpreadsheet,
				parser : Miso.Dataset.Parsers.GoogleSpreadsheet,
				key : '0AtnV9m5qu78_dEY2dWNIRXNhTk1USk9rRG9McTFuMkE',
				worksheet: '1'
			});
		}
		rawData.fetch({
			success: function() {
				this.each(function(row){
					if(items.peopleData[row.name]) {
						items.peopleData[row.name].status = row.status;
					}
				});
				items.ready = true;
				console.log('items ready');
			},
			error: function() {
				console.log('having a bad day? Try backup data!');
				loadData(true);
			}
		});
	}

	function _animateItem(item) {
		item.curFrame++;
		if(item.curFrame >= item.animation.length) {
			item.curFrame = 0;
		}
		var position = - item.animation[item.curFrame] * item.w + 'px 0';
		// console.log(position);
		item.selector.css('background-position', position);
	}

	function _prefixedEvent(element, type, callback) {
		for (var p = 0; p < _pfx.length; p++) {
		if (!_pfx[p]) type = type.toLowerCase();
		element.addEventListener(_pfx[p]+type, callback, false);
		}
	}

	function _animationListener(e) {
		var key = e.srcElement.id,
			item = items.itemData[key];

		if(typeof item.css.updateImage === 'function') {
			item.css.updateImage();
		}
	}
})();