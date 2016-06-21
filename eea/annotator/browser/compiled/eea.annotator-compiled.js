(function(root) {
define("resource-plone-app-jquerytools-js", ["jquery"], function() {
  return (function() {
/**
 * @license
 * jQuery Tools @VERSION Overlay - Overlay base. Extend it.
 *
 * NO COPYRIGHTS OR LICENSES. DO WHAT YOU LIKE.
 *
 * http://flowplayer.org/tools/overlay/
 *
 * Since: March 2008
 * Date: @DATE
 */
(function($) {

    // static constructs
    $.tools = $.tools || {version: '@VERSION'};

    $.tools.overlay = {

        addEffect: function(name, loadFn, closeFn) {
            effects[name] = [loadFn, closeFn];
        },

        conf: {
            close: null,
            closeOnClick: true,
            closeOnEsc: true,
            closeSpeed: 'fast',
            effect: 'default',

            // since 1.2. fixed positioning not supported by IE6
            fixed: !/msie/.test(navigator.userAgent.toLowerCase()) || navigator.appVersion > 6,

            left: 'center',
            load: false, // 1.2
            mask: null,
            oneInstance: true,
            speed: 'normal',
            target: null, // target element to be overlayed. by default taken from [rel]
            top: '10%'
        }
    };


    var instances = [], effects = {};

    // the default effect. nice and easy!
    $.tools.overlay.addEffect('default',

        /*
            onLoad/onClose functions must be called otherwise none of the
            user supplied callback methods won't be called
        */
        function(pos, onLoad) {

            var conf = this.getConf(),
                 w = $(window);

            if (!conf.fixed)  {
                pos.top += w.scrollTop();
                pos.left += w.scrollLeft();
            }

            pos.position = conf.fixed ? 'fixed' : 'absolute';
            this.getOverlay().css(pos).fadeIn(conf.speed, onLoad);

        }, function(onClose) {
            this.getOverlay().fadeOut(this.getConf().closeSpeed, onClose);
        }
    );


    function Overlay(trigger, conf) {

        // private variables
        var self = this,
             fire = trigger.add(self),
             w = $(window),
             closers,
             overlay,
             opened,
             maskConf = $.tools.expose && (conf.mask || conf.expose),
             uid = Math.random().toString().slice(10);


        // mask configuration
        if (maskConf) {
            if (typeof maskConf == 'string') { maskConf = {color: maskConf}; }
            maskConf.closeOnClick = maskConf.closeOnEsc = false;
        }

        // get overlay and trigger
        var jq = conf.target || trigger.attr("rel");
        overlay = jq ? $(jq) : null || trigger;

        // overlay not found. cannot continue
        if (!overlay.length) { throw "Could not find Overlay: " + jq; }

        // trigger's click event
        if (trigger && trigger.index(overlay) == -1) {
            trigger.click(function(e) {
                self.load(e);
                return e.preventDefault();
            });
        }

        // API methods
        $.extend(self, {

            load: function(e) {

                // can be opened only once
                if (self.isOpened()) { return self; }

                // find the effect
                var eff = effects[conf.effect];
                if (!eff) { throw "Overlay: cannot find effect : \"" + conf.effect + "\""; }

                // close other instances?
                if (conf.oneInstance) {
                    $.each(instances, function() {
                        this.close(e);
                    });
                }

                // onBeforeLoad
                e = e || $.Event();
                e.type = "onBeforeLoad";
                fire.trigger(e);
                if (e.isDefaultPrevented()) { return self; }

                // opened
                opened = true;

                // possible mask effect
                if (maskConf) { $(overlay).expose(maskConf); }

                // position & dimensions
                var top = conf.top,
                     left = conf.left,
                     oWidth = overlay.outerWidth(true),
                     oHeight = overlay.outerHeight(true);

                if (typeof top == 'string')  {
                    top = top == 'center' ? Math.max((w.height() - oHeight) / 2, 0) :
                        parseInt(top, 10) / 100 * w.height();
                }

                if (left == 'center') { left = Math.max((w.width() - oWidth) / 2, 0); }


                // load effect
                eff[0].call(self, {top: top, left: left}, function() {
                    if (opened) {
                        e.type = "onLoad";
                        fire.trigger(e);
                    }
                });

                // mask.click closes overlay
                if (maskConf && conf.closeOnClick) {
                    $.mask.getMask().one("click", self.close);
                }

                // when window is clicked outside overlay, we close
                if (conf.closeOnClick) {
                    $(document).on("click." + uid, function(e) {
                        if (!$(e.target).parents(overlay).length) {
                            self.close(e);
                        }
                    });
                }

                // keyboard::escape
                if (conf.closeOnEsc) {

                    // one callback is enough if multiple instances are loaded simultaneously
                    $(document).on("keydown." + uid, function(e) {
                        if (e.keyCode == 27) {
                            self.close(e);
                        }
                    });
                }


                return self;
            },

            close: function(e) {

                if (!self.isOpened()) { return self; }

                e = e || $.Event();
                e.type = "onBeforeClose";
                fire.trigger(e);
                if (e.isDefaultPrevented()) { return; }

                opened = false;

                // close effect
                effects[conf.effect][1].call(self, function() {
                    e.type = "onClose";
                    fire.trigger(e);
                });

                // unbind the keyboard / clicking actions
                $(document).off("click." + uid + " keydown." + uid);

                if (maskConf) {
                    $.mask.close();
                }

                return self;
            },

            getOverlay: function() {
                return overlay;
            },

            getTrigger: function() {
                return trigger;
            },

            getClosers: function() {
                return closers;
            },

            isOpened: function()  {
                return opened;
            },

            // manipulate start, finish and speeds
            getConf: function() {
                return conf;
            }

        });

        // callbacks
        $.each("onBeforeLoad,onStart,onLoad,onBeforeClose,onClose".split(","), function(i, name) {

            // configuration
            if ($.isFunction(conf[name])) {
                $(self).on(name, conf[name]);
            }

            // API
            self[name] = function(fn) {
                if (fn) { $(self).on(name, fn); }
                return self;
            };
        });

        // close button
        closers = overlay.find(conf.close || ".close");

        if (!closers.length && !conf.close) {
            closers = $('<a class="close"></a>');
            overlay.prepend(closers);
        }

        closers.click(function(e) {
            self.close(e);
        });

        // autoload
        if (conf.load) { self.load(); }

    }

    // jQuery plugin initialization
    $.fn.overlay = function(conf) {

        // already constructed --> return API
        var el = this.data("overlay");
        if (el) { return el; }

        if ($.isFunction(conf)) {
            conf = {onBeforeLoad: conf};
        }

        conf = $.extend(true, {}, $.tools.overlay.conf, conf);

        this.each(function() {
            el = new Overlay($(this), conf);
            instances.push(el);
            $(this).data("overlay", el);
        });

        return conf.api ? el: this;
    };

})(jQuery);



/**
 * @license
 * jQuery Tools @VERSION Scrollable - New wave UI design
 *
 * NO COPYRIGHTS OR LICENSES. DO WHAT YOU LIKE.
 *
 * http://flowplayer.org/tools/scrollable.html
 *
 * Since: March 2008
 * Date: @DATE
 */
(function($) {

    // static constructs
    $.tools = $.tools || {version: '@VERSION'};

    $.tools.scrollable = {

        conf: {
            activeClass: 'active',
            circular: false,
            clonedClass: 'cloned',
            disabledClass: 'disabled',
            easing: 'swing',
            initialIndex: 0,
            item: '> *',
            items: '.items',
            keyboard: true,
            mousewheel: false,
            next: '.next',
            prev: '.prev',
            size: 1,
            speed: 400,
            vertical: false,
            touch: true,
            wheelSpeed: 0
        }
    };

    // get hidden element's width or height even though it's hidden
    function dim(el, key) {
        var v = parseInt(el.css(key), 10);
        if (v) { return v; }
        var s = el[0].currentStyle;
        return s && s.width && parseInt(s.width, 10);
    }

    function find(root, query) {
        var el = $(query);
        return el.length < 2 ? el : root.parent().find(query);
    }

    var current;

    // constructor
    function Scrollable(root, conf) {

        // current instance
        var self = this,
             fire = root.add(self),
             itemWrap = root.children(),
             index = 0,
             vertical = conf.vertical;

        if (!current) { current = self; }
        if (itemWrap.length > 1) { itemWrap = $(conf.items, root); }


        // in this version circular not supported when size > 1
        if (conf.size > 1) { conf.circular = false; }

        // methods
        $.extend(self, {

            getConf: function() {
                return conf;
            },

            getIndex: function() {
                return index;
            },

            getSize: function() {
                return self.getItems().size();
            },

            getNaviButtons: function() {
                return prev.add(next);
            },

            getRoot: function() {
                return root;
            },

            getItemWrap: function() {
                return itemWrap;
            },

            getItems: function() {
                return itemWrap.find(conf.item).not("." + conf.clonedClass);
            },

            move: function(offset, time) {
                return self.seekTo(index + offset, time);
            },

            next: function(time) {
                return self.move(conf.size, time);
            },

            prev: function(time) {
                return self.move(-conf.size, time);
            },

            begin: function(time) {
                return self.seekTo(0, time);
            },

            end: function(time) {
                return self.seekTo(self.getSize() -1, time);
            },

            focus: function() {
                current = self;
                return self;
            },

            addItem: function(item) {
                item = $(item);

                if (!conf.circular)  {
                    itemWrap.append(item);
                    next.removeClass("disabled");

                } else {
                    itemWrap.children().last().before(item);
                    itemWrap.children().first().replaceWith(item.clone().addClass(conf.clonedClass));
                }

                fire.trigger("onAddItem", [item]);
                return self;
            },


            /* all seeking functions depend on this */
            seekTo: function(i, time, fn) {

                // ensure numeric index
                if (!i.jquery) { i *= 1; }

                // avoid seeking from end clone to the beginning
                if (conf.circular && i === 0 && index == -1 && time !== 0) { return self; }

                // check that index is sane
                if (!conf.circular && i < 0 || i > self.getSize() || i < -1) { return self; }

                var item = i;

                if (i.jquery) {
                    i = self.getItems().index(i);

                } else {
                    item = self.getItems().eq(i);
                }

                // onBeforeSeek
                var e = $.Event("onBeforeSeek");
                if (!fn) {
                    fire.trigger(e, [i, time]);
                    if (e.isDefaultPrevented() || !item.length) { return self; }
                }

                var props = vertical ? {top: -item.position().top} : {left: -item.position().left};

                index = i;
                current = self;
                if (time === undefined) { time = conf.speed; }

                itemWrap.animate(props, time, conf.easing, fn || function() {
                    fire.trigger("onSeek", [i]);
                });

                return self;
            }

        });

        // callbacks
        $.each(['onBeforeSeek', 'onSeek', 'onAddItem'], function(i, name) {

            // configuration
            if ($.isFunction(conf[name])) {
                $(self).on(name, conf[name]);
            }

            self[name] = function(fn) {
                if (fn) { $(self).on(name, fn); }
                return self;
            };
        });

        // circular loop
        if (conf.circular) {

            var cloned1 = self.getItems().slice(-1).clone().prependTo(itemWrap),
                 cloned2 = self.getItems().eq(1).clone().appendTo(itemWrap);

            cloned1.add(cloned2).addClass(conf.clonedClass);

            self.onBeforeSeek(function(e, i, time) {

                if (e.isDefaultPrevented()) { return; }

                /*
                    1. animate to the clone without event triggering
                    2. seek to correct position with 0 speed
                */
                if (i == -1) {
                    self.seekTo(cloned1, time, function()  {
                        self.end(0);
                    });
                    return e.preventDefault();

                } else if (i == self.getSize()) {
                    self.seekTo(cloned2, time, function()  {
                        self.begin(0);
                    });
                }

            });

            // seek over the cloned item

            // if the scrollable is hidden the calculations for seekTo position
            // will be incorrect (eg, if the scrollable is inside an overlay).
            // ensure the elements are shown, calculate the correct position,
            // then re-hide the elements. This must be done synchronously to
            // prevent the hidden elements being shown to the user.

            // See: https://github.com/jquerytools/jquerytools/issues#issue/87

            var hidden_parents = root.parents().add(root).filter(function () {
                if ($(this).css('display') === 'none') {
                    return true;
                }
            });
            if (hidden_parents.length) {
                hidden_parents.show();
                self.seekTo(0, 0, function() {});
                hidden_parents.hide();
            }
            else {
                self.seekTo(0, 0, function() {});
            }

        }

        // next/prev buttons
        var prev = find(root, conf.prev).click(function(e) { e.stopPropagation(); self.prev(); }),
             next = find(root, conf.next).click(function(e) { e.stopPropagation(); self.next(); });

        if (!conf.circular) {
            self.onBeforeSeek(function(e, i) {
                setTimeout(function() {
                    if (!e.isDefaultPrevented()) {
                        prev.toggleClass(conf.disabledClass, i <= 0);
                        next.toggleClass(conf.disabledClass, i >= self.getSize() -1);
                    }
                }, 1);
            });

            if (!conf.initialIndex) {
                prev.addClass(conf.disabledClass);
            }
        }

        if (self.getSize() < 2) {
            prev.add(next).addClass(conf.disabledClass);
        }

        // mousewheel support
        if (conf.mousewheel && $.fn.mousewheel) {
            root.mousewheel(function(e, delta)  {
                if (conf.mousewheel) {
                    self.move(delta < 0 ? 1 : -1, conf.wheelSpeed || 50);
                    return false;
                }
            });
        }

        // touch event
        if (conf.touch) {
            var touch = {};

            itemWrap[0].ontouchstart = function(e) {
                var t = e.touches[0];
                touch.x = t.clientX;
                touch.y = t.clientY;
            };

            itemWrap[0].ontouchmove = function(e) {

                // only deal with one finger
                if (e.touches.length == 1 && !itemWrap.is(":animated")) {
                    var t = e.touches[0],
                         deltaX = touch.x - t.clientX,
                         deltaY = touch.y - t.clientY;

                    self[vertical && deltaY > 0 || !vertical && deltaX > 0 ? 'next' : 'prev']();
                    e.preventDefault();
                }
            };
        }

        if (conf.keyboard)  {

            $(document).on("keydown.scrollable", function(evt) {

                // skip certain conditions
                if (!conf.keyboard || evt.altKey || evt.ctrlKey || evt.metaKey || $(evt.target).is(":input")) {
                    return;
                }

                // does this instance have focus?
                if (conf.keyboard != 'static' && current != self) { return; }

                var key = evt.keyCode;

                if (vertical && (key == 38 || key == 40)) {
                    self.move(key == 38 ? -1 : 1);
                    return evt.preventDefault();
                }

                if (!vertical && (key == 37 || key == 39)) {
                    self.move(key == 37 ? -1 : 1);
                    return evt.preventDefault();
                }

            });
        }

        // initial index
        if (conf.initialIndex) {
            self.seekTo(conf.initialIndex, 0, function() {});
        }
    }


    // jQuery plugin implementation
    $.fn.scrollable = function(conf) {

        // already constructed --> return API
        var el = this.data("scrollable");
        if (el) { return el; }

        conf = $.extend({}, $.tools.scrollable.conf, conf);

        this.each(function() {
            el = new Scrollable($(this), conf);
            $(this).data("scrollable", el);
        });

        return conf.api ? el: this;

    };


})(jQuery);


/**
 * @license
 * jQuery Tools @VERSION Tabs- The basics of UI design.
 *
 * NO COPYRIGHTS OR LICENSES. DO WHAT YOU LIKE.
 *
 * http://flowplayer.org/tools/tabs/
 *
 * Since: November 2008
 * Date: @DATE
 */
(function($) {

    // static constructs
    $.tools = $.tools || {version: '@VERSION'};

    $.tools.tabs = {

        conf: {
            tabs: 'a',
            current: 'current',
            onBeforeClick: null,
            onClick: null,
            effect: 'default',
            initialEffect: false,   // whether or not to show effect in first init of tabs
            initialIndex: 0,
            event: 'click',
            rotate: false,

      // slide effect
      slideUpSpeed: 400,
      slideDownSpeed: 400,

            // 1.2
            history: false
        },

        addEffect: function(name, fn) {
            effects[name] = fn;
        }

    };

    var effects = {

        // simple "toggle" effect
        'default': function(i, done) {
            this.getPanes().hide().eq(i).show();
            done.call();
        },

        /*
            configuration:
                - fadeOutSpeed (positive value does "crossfading")
                - fadeInSpeed
        */
        fade: function(i, done) {

            var conf = this.getConf(),
                 speed = conf.fadeOutSpeed,
                 panes = this.getPanes();

            if (speed) {
                panes.fadeOut(speed);
            } else {
                panes.hide();
            }

            panes.eq(i).fadeIn(conf.fadeInSpeed, done);
        },

        // for basic accordions
        slide: function(i, done) {
          var conf = this.getConf();

            this.getPanes().slideUp(conf.slideUpSpeed);
            this.getPanes().eq(i).slideDown(conf.slideDownSpeed, done);
        },

        /**
         * AJAX effect
         */
        ajax: function(i, done)  {
            this.getPanes().eq(0).load(this.getTabs().eq(i).attr("href"), done);
        }
    };

    /**
     * Horizontal accordion
     *
     * @deprecated will be replaced with a more robust implementation
    */

    var
      /**
      *   @type {Boolean}
      *
      *   Mutex to control horizontal animation
      *   Disables clicking of tabs while animating
      *   They mess up otherwise as currentPane gets set *after* animation is done
      */
      animating,
      /**
      *   @type {Number}
      *
      *   Initial width of tab panes
      */
      w;

    $.tools.tabs.addEffect("horizontal", function(i, done) {
      if (animating) return;    // don't allow other animations

      var nextPane = this.getPanes().eq(i),
          currentPane = this.getCurrentPane();

        // store original width of a pane into memory
        w || ( w = this.getPanes().eq(0).width() );
        animating = true;

        nextPane.show(); // hidden by default

        // animate current pane's width to zero
    // animate next pane's width at the same time for smooth animation
    currentPane.animate({width: 0}, {
      step: function(now){
        nextPane.css("width", w-now);
      },
      complete: function(){
        $(this).hide();
        done.call();
        animating = false;
     }
    });
    // Dirty hack...  onLoad, currentPant will be empty and nextPane will be the first pane
    // If this is the case, manually run callback since the animation never occured, and reset animating
    if (!currentPane.length){
      done.call();
      animating = false;
    }
    });


    function Tabs(root, paneSelector, conf) {

        var self = this,
        trigger = root.add(this),
        tabs = root.find(conf.tabs),
        panes = paneSelector.jquery ? paneSelector : root.children(paneSelector),
        current;


        // make sure tabs and panes are found
        if (!tabs.length)  { tabs = root.children(); }
        if (!panes.length) { panes = root.parent().find(paneSelector); }
        if (!panes.length) { panes = $(paneSelector); }


        // public methods
        $.extend(this, {
            click: function(i, e) {

                var tab = tabs.eq(i),
                    firstRender = !root.data('tabs');

                if (typeof i == 'string' && i.replace("#", "")) {
                    tab = tabs.filter("[href*=\"" + i.replace("#", "") + "\"]");
                    i = Math.max(tabs.index(tab), 0);
                }

                if (conf.rotate) {
                    var last = tabs.length -1;
                    if (i < 0) { return self.click(last, e); }
                    if (i > last) { return self.click(0, e); }
                }

                if (!tab.length) {
                    if (current >= 0) { return self; }
                    i = conf.initialIndex;
                    tab = tabs.eq(i);
                }

                // current tab is being clicked
                if (i === current) { return self; }

                // possibility to cancel click action
                e = e || $.Event();
                e.type = "onBeforeClick";
                trigger.trigger(e, [i]);
                if (e.isDefaultPrevented()) { return; }

        // if firstRender, only run effect if initialEffect is set, otherwise default
                var effect = firstRender ? conf.initialEffect && conf.effect || 'default' : conf.effect;

                // call the effect
                effects[effect].call(self, i, function() {
                    current = i;
                    // onClick callback
                    e.type = "onClick";
                    trigger.trigger(e, [i]);
                });

                // default behaviour
                tabs.removeClass(conf.current);
                tab.addClass(conf.current);

                return self;
            },

            getConf: function() {
                return conf;
            },

            getTabs: function() {
                return tabs;
            },

            getPanes: function() {
                return panes;
            },

            getCurrentPane: function() {
                return panes.eq(current);
            },

            getCurrentTab: function() {
                return tabs.eq(current);
            },

            getIndex: function() {
                return current;
            },

            next: function() {
                return self.click(current + 1);
            },

            prev: function() {
                return self.click(current - 1);
            },

            destroy: function() {
                tabs.off(conf.event).removeClass(conf.current);
                panes.find("a[href^=\"#\"]").off("click.T");
                return self;
            }

        });

        // callbacks
        $.each("onBeforeClick,onClick".split(","), function(i, name) {

            // configuration
            if ($.isFunction(conf[name])) {
                $(self).on(name, conf[name]);
            }

            // API
            self[name] = function(fn) {
                if (fn) { $(self).on(name, fn); }
                return self;
            };
        });


        if (conf.history && $.fn.history) {
            $.tools.history.init(tabs);
            conf.event = 'history';
        }

        // setup click actions for each tab
        tabs.each(function(i) {
            $(this).on(conf.event, function(e) {
                self.click(i, e);
                return e.preventDefault();
            });
        });

        // cross tab anchor link
        panes.find("a[href^=\"#\"]").on("click.T", function(e) {
            self.click($(this).attr("href"), e);
        });

        // open initial tab
        if (location.hash && conf.tabs == "a" && root.find("[href=\"" +location.hash+ "\"]").length) {
            self.click(location.hash);

        } else {
            if (conf.initialIndex === 0 || conf.initialIndex > 0) {
                self.click(conf.initialIndex);
            }
        }

    }


    // jQuery plugin implementation
    $.fn.tabs = function(paneSelector, conf) {

        // return existing instance
        var el = this.data("tabs");
        if (el) {
            el.destroy();
            this.removeData("tabs");
        }

        if ($.isFunction(conf)) {
            conf = {onBeforeClick: conf};
        }

        // setup conf
        conf = $.extend({}, $.tools.tabs.conf, conf);


        this.each(function() {
            el = new Tabs($(this), paneSelector, conf);
            $(this).data("tabs", el);
        });

        return conf.api ? el: this;
    };

}) (jQuery);




/**
 * @license
 * jQuery Tools @VERSION History "Back button for AJAX apps"
 *
 * NO COPYRIGHTS OR LICENSES. DO WHAT YOU LIKE.
 *
 * http://flowplayer.org/tools/toolbox/history.html
 *
 * Since: Mar 2010
 * Date: @DATE
 */
(function($) {

    var hash, iframe, links, inited;

    $.tools = $.tools || {version: '@VERSION'};

    $.tools.history = {

        init: function(els) {

            if (inited) { return; }

            // IE
            if ($.browser.msie && $.browser.version < '8') {

                // create iframe that is constantly checked for hash changes
                if (!iframe) {
                    iframe = $("<iframe/>").attr("src", "javascript:false;").hide().get(0);
                    $("body").append(iframe);

                    setInterval(function() {
                        var idoc = iframe.contentWindow.document,
                             h = idoc.location.hash;

                        if (hash !== h) {
                            $(window).trigger("hash", h);
                        }
                    }, 100);

                    setIframeLocation(location.hash || '#');
                }


            // other browsers scans for location.hash changes directly without iframe hack
            } else {
                setInterval(function() {
                    var h = location.hash;
                    if (h !== hash) {
                        $(window).trigger("hash", h);
                    }
                }, 100);
            }

            links = !links ? els : links.add(els);

            els.click(function(e) {
                var href = $(this).attr("href");
                if (iframe) { setIframeLocation(href); }

                // handle non-anchor links
                if (href.slice(0, 1) != "#") {
                    location.href = "#" + href;
                    return e.preventDefault();
                }

            });

            inited = true;
        }
    };


    function setIframeLocation(h) {
        if (h) {
            var doc = iframe.contentWindow.document;
            doc.open().close();
            doc.location.hash = h;
        }
    }

    // global histroy change listener
    $(window).on("hash", function(e, h)  {
        if (h) {
            links.filter(function() {
              var href = $(this).attr("href");
              return href == h || href == h.replace("#", "");
            }).trigger("history", [h]);
        } else {
            links.eq(0).trigger("history", [h]);
        }

        hash = h;

    });


    // jQuery plugin implementation
    $.fn.history = function(fn) {

        $.tools.history.init(this);

        // return jQuery
        return this.on("history", fn);
    };

})(jQuery);



/**
 * @license
 * jQuery Tools @VERSION / Expose - Dim the lights
 *
 * NO COPYRIGHTS OR LICENSES. DO WHAT YOU LIKE.
 *
 * http://flowplayer.org/tools/toolbox/expose.html
 *
 * Since: Mar 2010
 * Date: @DATE
 */
(function($) {

    // static constructs
    $.tools = $.tools || {version: '@VERSION'};

    var tool;

    tool = $.tools.expose = {

        conf: {
            maskId: 'exposeMask',
            loadSpeed: 'slow',
            closeSpeed: 'fast',
            closeOnClick: true,
            closeOnEsc: true,

            // css settings
            zIndex: 9998,
            opacity: 0.8,
            startOpacity: 0,
            color: '#fff',

            // callbacks
            onLoad: null,
            onClose: null
        }
    };

    /* one of the greatest headaches in the tool. finally made it */
    function viewport() {

        // the horror case
        if (/msie/.test(navigator.userAgent.toLowerCase())) {

            // if there are no scrollbars then use window.height
            var d = $(document).height(), w = $(window).height();

            return [
                window.innerWidth ||                            // ie7+
                document.documentElement.clientWidth ||     // ie6
                document.body.clientWidth,                  // ie6 quirks mode
                d - w < 20 ? w : d
            ];
        }

        // other well behaving browsers
        return [$(document).width(), $(document).height()];
    }

    function call(fn) {
        if (fn) { return fn.call($.mask); }
    }

    var mask, exposed, loaded, config, overlayIndex;


    $.mask = {

        load: function(conf, els) {

            // already loaded ?
            if (loaded) { return this; }

            // configuration
            if (typeof conf == 'string') {
                conf = {color: conf};
            }

            // use latest config
            conf = conf || config;

            config = conf = $.extend($.extend({}, tool.conf), conf);

            // get the mask
            mask = $("#" + conf.maskId);

            // or create it
            if (!mask.length) {
                mask = $('<div/>').attr("id", conf.maskId);
                $("body").append(mask);
            }

            // set position and dimensions
            var size = viewport();

            mask.css({
                position:'absolute',
                top: 0,
                left: 0,
                width: size[0],
                height: size[1],
                display: 'none',
                opacity: conf.startOpacity,
                zIndex: conf.zIndex
            });

            if (conf.color) {
                mask.css("backgroundColor", conf.color);
            }

            // onBeforeLoad
            if (call(conf.onBeforeLoad) === false) {
                return this;
            }

            // esc button
            if (conf.closeOnEsc) {
                $(document).on("keydown.mask", function(e) {
                    if (e.keyCode == 27) {
                        $.mask.close(e);
                    }
                });
            }

            // mask click closes
            if (conf.closeOnClick) {
                mask.on("click.mask", function(e)  {
                    $.mask.close(e);
                });
            }

            // resize mask when window is resized
            $(window).on("resize.mask", function() {
                $.mask.fit();
            });

            // exposed elements
            if (els && els.length) {

                overlayIndex = els.eq(0).css("zIndex");

                // make sure element is positioned absolutely or relatively
                $.each(els, function() {
                    var el = $(this);
                    if (!/relative|absolute|fixed/i.test(el.css("position"))) {
                        el.css("position", "relative");
                    }
                });

                // make elements sit on top of the mask
                exposed = els.css({ zIndex: Math.max(conf.zIndex + 1, overlayIndex == 'auto' ? 0 : overlayIndex)});
            }

            // reveal mask
            mask.css({display: 'block'}).fadeTo(conf.loadSpeed, conf.opacity, function() {
                $.mask.fit();
                call(conf.onLoad);
                loaded = "full";
            });

            loaded = true;
            return this;
        },

        close: function() {
            if (loaded) {

                // onBeforeClose
                if (call(config.onBeforeClose) === false) { return this; }

                mask.fadeOut(config.closeSpeed, function()  {
                    if (exposed) {
                        exposed.css({zIndex: overlayIndex});
                    }
                    loaded = false;
                    call(config.onClose);
                });

                // unbind various event listeners
                $(document).off("keydown.mask");
                mask.off("click.mask");
                $(window).off("resize.mask");
            }

            return this;
        },

        fit: function() {
            if (loaded) {
                var size = viewport();
                mask.css({width: size[0], height: size[1]});
            }
        },

        getMask: function() {
            return mask;
        },

        isLoaded: function(fully) {
            return fully ? loaded == 'full' : loaded;
        },

        getConf: function() {
            return config;
        },

        getExposed: function() {
            return exposed;
        }
    };

    $.fn.mask = function(conf) {
        $.mask.load(conf);
        return this;
    };

    $.fn.expose = function(conf) {
        $.mask.load(conf, this);
        return this;
    };


})(jQuery);


/**
 * @license
 * jQuery Tools @VERSION Tooltip - UI essentials
 *
 * NO COPYRIGHTS OR LICENSES. DO WHAT YOU LIKE.
 *
 * http://flowplayer.org/tools/tooltip/
 *
 * Since: November 2008
 * Date: @DATE
 */
(function($) {
    // static constructs
    $.tools = $.tools || {version: '@VERSION'};

    $.tools.tooltip = {

        conf: {

            // default effect variables
            effect: 'toggle',
            fadeOutSpeed: "fast",
            predelay: 0,
            delay: 30,
            opacity: 1,
            tip: 0,
            fadeIE: false, // enables fade effect in IE

            // 'top', 'bottom', 'right', 'left', 'center'
            position: ['top', 'center'],
            offset: [0, 0],
            relative: false,
            cancelDefault: true,

            // type to event mapping
            events: {
                def:            "mouseenter,mouseleave",
                input:      "focus,blur",
                widget:     "focus mouseenter,blur mouseleave",
                tooltip:        "mouseenter,mouseleave"
            },

            // 1.2
            layout: '<div/>',
            tipClass: 'tooltip'
        },

        addEffect: function(name, loadFn, hideFn) {
            effects[name] = [loadFn, hideFn];
        }
    };


    var effects = {
        toggle: [
            function(done) {
                var conf = this.getConf(), tip = this.getTip(), o = conf.opacity;
                if (o < 1) { tip.css({opacity: o}); }
                tip.show();
                done.call();
            },

            function(done) {
                this.getTip().hide();
                done.call();
            }
        ],

        fade: [
            function(done) {
                var conf = this.getConf();
                if (!/msie/.test(navigator.userAgent.toLowerCase()) || conf.fadeIE) {
                    this.getTip().fadeTo(conf.fadeInSpeed, conf.opacity, done);
                }
                else {
                    this.getTip().show();
                    done();
                }
            },
            function(done) {
                var conf = this.getConf();
                if (!/msie/.test(navigator.userAgent.toLowerCase()) || conf.fadeIE) {
                    this.getTip().fadeOut(conf.fadeOutSpeed, done);
                }
                else {
                    this.getTip().hide();
                    done();
                }
            }
        ]
    };


    /* calculate tip position relative to the trigger */
    function getPosition(trigger, tip, conf) {


        // get origin top/left position
        var top = conf.relative ? trigger.position().top : trigger.offset().top,
             left = conf.relative ? trigger.position().left : trigger.offset().left,
             pos = conf.position[0];

        top  -= tip.outerHeight() - conf.offset[0];
        left += trigger.outerWidth() + conf.offset[1];

        // iPad position fix
        if (/iPad/i.test(navigator.userAgent)) {
            top -= $(window).scrollTop();
        }

        // adjust Y
        var height = tip.outerHeight() + trigger.outerHeight();
        if (pos == 'center')    { top += height / 2; }
        if (pos == 'bottom')    { top += height; }


        // adjust X
        pos = conf.position[1];
        var width = tip.outerWidth() + trigger.outerWidth();
        if (pos == 'center')    { left -= width / 2; }
        if (pos == 'left')      { left -= width; }

        return {top: top, left: left};
    }



    function Tooltip(trigger, conf) {

        var self = this,
             fire = trigger.add(self),
             tip,
             timer = 0,
             pretimer = 0,
             title = trigger.attr("title"),
             tipAttr = trigger.attr("data-tooltip"),
             effect = effects[conf.effect],
             shown,

             // get show/hide configuration
             isInput = trigger.is(":input"),
             isWidget = isInput && trigger.is(":checkbox, :radio, select, :button, :submit"),
             type = trigger.attr("type"),
             evt = conf.events[type] || conf.events[isInput ? (isWidget ? 'widget' : 'input') : 'def'];


        // check that configuration is sane
        if (!effect) { throw "Nonexistent effect \"" + conf.effect + "\""; }

        evt = evt.split(/,\s*/);
        if (evt.length != 2) { throw "Tooltip: bad events configuration for " + type; }


        // trigger --> show
        trigger.on(evt[0], function(e) {

            clearTimeout(timer);
            if (conf.predelay) {
                pretimer = setTimeout(function() { self.show(e); }, conf.predelay);

            } else {
                self.show(e);
            }

        // trigger --> hide
        }).on(evt[1], function(e)  {
            clearTimeout(pretimer);
            if (conf.delay)  {
                timer = setTimeout(function() { self.hide(e); }, conf.delay);

            } else {
                self.hide(e);
            }

        });


        // remove default title
        if (title && conf.cancelDefault) {
            trigger.removeAttr("title");
            trigger.data("title", title);
        }

        $.extend(self, {

            show: function(e) {

                // tip not initialized yet
                if (!tip) {

                    // data-tooltip
                    if (tipAttr) {
                        tip = $(tipAttr);

                    // single tip element for all
                    } else if (conf.tip) {
                        tip = $(conf.tip).eq(0);

                    // autogenerated tooltip
                    } else if (title) {
                        tip = $(conf.layout).addClass(conf.tipClass).appendTo(document.body)
                            .hide().append(title);

                    // manual tooltip
                    } else {
                        tip = trigger.find('.' + conf.tipClass);
                        if (!tip.length) { tip = trigger.next(); }
                        if (!tip.length) { tip = trigger.parent().next(); }
                    }

                    if (!tip.length) { throw "Cannot find tooltip for " + trigger;  }
                }

                if (self.isShown()) { return self; }

                // stop previous animation
                tip.stop(true, true);

                // get position
                var pos = getPosition(trigger, tip, conf);

                // restore title for single tooltip element
                if (conf.tip) {
                    tip.html(trigger.data("title"));
                }

                // onBeforeShow
                e = $.Event();
                e.type = "onBeforeShow";
                fire.trigger(e, [pos]);
                if (e.isDefaultPrevented()) { return self; }


                // onBeforeShow may have altered the configuration
                pos = getPosition(trigger, tip, conf);

                // set position
                tip.css({position:'absolute', top: pos.top, left: pos.left});

                shown = true;

                // invoke effect
                effect[0].call(self, function() {
                    e.type = "onShow";
                    shown = 'full';
                    fire.trigger(e);
                });


                // tooltip events
                var event = conf.events.tooltip.split(/,\s*/);

                if (!tip.data("__set")) {

                    tip.off(event[0]).on(event[0], function() {
                        clearTimeout(timer);
                        clearTimeout(pretimer);
                    });

                    if (event[1] && !trigger.is("input:not(:checkbox, :radio), textarea")) {
                        tip.off(event[1]).on(event[1], function(e) {

                            // being moved to the trigger element
                            if (e.relatedTarget != trigger[0]) {
                                trigger.trigger(evt[1].split(" ")[0]);
                            }
                        });
                    }

                    // bind agein for if same tip element
                    if (!conf.tip) tip.data("__set", true);
                }

                return self;
            },

            hide: function(e) {

                if (!tip || !self.isShown()) { return self; }

                // onBeforeHide
                e = $.Event();
                e.type = "onBeforeHide";
                fire.trigger(e);
                if (e.isDefaultPrevented()) { return; }

                shown = false;

                effects[conf.effect][1].call(self, function() {
                    e.type = "onHide";
                    fire.trigger(e);
                });

                return self;
            },

            isShown: function(fully) {
                return fully ? shown == 'full' : shown;
            },

            getConf: function() {
                return conf;
            },

            getTip: function() {
                return tip;
            },

            getTrigger: function() {
                return trigger;
            }

        });

        // callbacks
        $.each("onHide,onBeforeShow,onShow,onBeforeHide".split(","), function(i, name) {

            // configuration
            if ($.isFunction(conf[name])) {
                $(self).on(name, conf[name]);
            }

            // API
            self[name] = function(fn) {
                if (fn) { $(self).on(name, fn); }
                return self;
            };
        });

    }


    // jQuery plugin implementation
    $.fn.tooltip = function(conf) {

        // return existing instance
        var api = this.data("tooltip");
        if (api) { return api; }

        conf = $.extend(true, {}, $.tools.tooltip.conf, conf);

        // position can also be given as string
        if (typeof conf.position == 'string') {
            conf.position = conf.position.split(/,?\s/);
        }

        // install tooltip for each entry in jQuery object
        this.each(function() {
            api = new Tooltip($(this), conf);
            $(this).data("tooltip", api);
        });

        return conf.api ? api: this;
    };

}) (jQuery);





  }).apply(root, arguments);
});
}(this));

if(!jQuery.fn.addBack){
  jQuery.fn.addBack = jQuery.fn.andSelf;
}

if(window.EEA === undefined){
  var EEA = {
    who: 'eea.annotator',
    version: '1.0'
  };
}

if(!EEA.eea_accordion){
  $.tools.tabs.addEffect("collapsed", function(i, done) {
      // #17555; passed an empty effect for the collapsed accordion
      // using instead use a simple slide for the accordion headers

  });
  EEA.eea_accordion = function ($folder_panels) {
    if (!$folder_panels) {
      $folder_panels = $('.eea-accordion-panels');
    }
    if ($folder_panels.length) {
      $folder_panels.each(function (idx, el) {
        var $el = $(el);
        var effect = 'slide';
        var current_class = "current";
        var initial_index = 0;
        var $pane = $el.find('.pane');

        if ($el.hasClass('collapsed-by-default')) {
          // hide all panels if using the above class
          effect = 'slide';
          initial_index = null;
          $pane.hide();
        }

        if ($el.hasClass('non-exclusive')) {
          // show the first panel only if we don't have also the
          // collapsed-by-default class
          if (!$el.hasClass('collapsed-by-default')) {
            $pane.not(':first').hide();
            $pane.eq(0).prev().addClass('current');
          }

          effect = 'collapsed';
          current_class = "default";
          // allow the hiding of the currently opened accordion
          $el.find('.eea-accordion-title, h2').click(function (ev) {
            var $el = $(this);
            if (!$el.hasClass('current')) {
              $el.addClass('current').next().slideDown();
            }
            else {
              $el.removeClass('current').next().slideUp();
            }
          });
        }

        $el.tabs($pane,
          {   tabs: '.eea-accordion-title, h2',
            effect: effect, initialIndex: initial_index,
            current: current_class,
            onBeforeClick: function (ev, idx) {
              // allows third party applications to hook into these 2 event handlers
              $(ev.target).trigger("eea-accordion-before-click", { event: ev, index: idx});
            },
            onClick: function (ev, idx) {
              $(ev.target).trigger("eea-accordion-on-click", { event: ev, index: idx});
            }
          }
        );
      });

    }
  };
}

EEA.AnnotatorWorker = {
  running: null,
  interval: 0,
  latest: null,
  tries: 3,
  callback: null,

  start: function(interval, url, current, callback){
    var self = this;

    // Avoid multiple instances
    if(self.running){
      self.log('auto-sync already running');
      return;
    }

    if(interval <= 0){
      self.log('auto-sync is disabled');
      return;
    }

    self.url = url;
    self.callback = callback;

    self.log('auto-sync started. Running every ' + interval + 's');
    if(interval < 1000){
      interval *= 1000;
    }

    self.interval = interval;
    self.running = true;
    self.filter(current);
    self.run();
  },

  stop: function(){
    var self = this;
    if(self.running){
      clearTimeout(self.running);
      self.running = null;
      self.log('auto-sync stopped');
    }
  },

  run: function(){
    var self = this;
    self.running = setTimeout( function(){
      jQuery.ajax({
        dataType: "json",
        url: self.url,
        data: {},
        success: function(data, textStatus, jqXHR){
          self.tries = 3;
          data = self.filter(data);
          self.callback(data);
          return self.run();
        },
        error: function(jqXHR, textStatus, errorThrown){
          self.tries -= 1;
          // Abort after 3 tries
          self.log('ERROR: ' + errorThrown + ' ' + textStatus + '. Remaining tries: ' + self.tries);
          if(self.tries > 0){
            return self.run();
          }
        }
      });
    }, self.interval );
  },

  filter: function(data){
    var iso, now, self = this;

    // Init
    if(!self.latest){
      jQuery.each(data, function(idx, item){
        now = item.updated.endsWith('Z') ? item.updated : item.updated + 'Z';
        if(!self.latest){
          self.latest = now;
        }else if(now > self.latest){
          self.latest = now;
        }
      });
      return data;
    }

    // Filter only items that where changed meanwhile
    var latest = self.latest;
    var newData = jQuery.map(data, function(item, idx){
      now = item.updated.endsWith('Z') ? item.updated : item.updated + 'Z';
      if(now > self.latest){
        if(now > latest){
          latest = now;
        }
        return item;
      }else{
        return null;
      }
    });

    // Update the new latest
    self.latest = latest;
    return newData;
  },

  log: function(msg){
    if(window.console){
      console.log('eea.annotator: ' + msg);
    }
  }
};


EEA.Annotator = function(context, options){
  var self = this;
  self.context = context;
  self.target = jQuery('#content');

  var authenticator = self.context.find('input[name="_authenticator"]');
  authenticator = authenticator ? authenticator.val() : "";
  self.settings = {
    readOnly: self.context.data('readonly') || 0,
    autoSync: self.context.data('autosync') || 0,
    noDuplicates: self.context.data('noduplicates') || false,
    minWords: self.context.data('minwords') || 0,
    authenticator: authenticator,
    history: true,
    worker: '',
    prefix: '',
    user: {
      id: self.context.data('userid') || 'anonymous',
      name: self.context.data('username') || 'Anonymous'
    },
    urls: {
      create:  '/annotations_edit',
      read:    '/annotations_view/:id',
      update:  '/annotations_edit/:id',
      destroy: '/annotations_edit/:id',
      search:  '/annotations_search'
    }
  };

  if(options){
    jQuery.extend(self.settings, options);
  }

  self.initialize();
};

EEA.Annotator.prototype = {
  initialize: function(){
    var self = this;
    self.button = self.context.find('.annotator-button');
    self.button.attr('title', self.button.data('hide'));
    self.enabled = true;

    self.button.click(function(evt){
      evt.preventDefault();
      return self.click();
    });

    // Auto-sync inline comments
    self.worker = EEA.AnnotatorWorker;

    self.reload();
  },

  click: function(){
    var self = this;
    if(self.enabled){
      self.enabled = false;
      self.button.addClass('annotator-disabled');
      self.button.attr('title', self.button.data('show'));
      self.target.annotator('destroy');
      self.worker.stop();
    }else{
      self.enabled = true;
      self.button.removeClass('annotator-disabled');
      self.button.attr('title', self.button.data('hide'));
      self.reload();
    }
  },

  reload: function(){
    var self = this;

    // Init annotator
    self.target.annotator({
      readOnly: Boolean(self.settings.readOnly),
      exactMatch: true,
      noDuplicates: Boolean(self.settings.noDuplicates),
      minWords: parseInt(self.settings.minWords, 10),
      authenticator: self.settings.authenticator
    });

    // Add comment date
    self.target.annotator('addField', {
      load: function(field, annotation){
        var iso_date = annotation.created;
        if(!iso_date){
          return;
        }
        if (iso_date.endsWith('Z')) {
          iso_date += 'Z';
        }
        var published = new Date(iso_date);
        var dateString = Util.easyDate(published);
        $(field)
          .html(dateString)
          .addClass('annotator-date')
          .attr('title', Util.prettyDateString(published));
      }
    });
    // Permissions plugin
    self.target.annotator('addPlugin', 'Permissions', {
      user: self.settings.user,
      userId: function(user){
        if(user && user.id){
          return user.id;
        }
        return user;
      },
      userString: function(user){
        return Util.userString(user);
      },
      permissions: {
        'read':   [],
        'update': [self.settings.user.id],
        'delete': [],
        'admin':  [self.settings.user.id]
      },
      showViewPermissionsCheckbox: false,
      showEditPermissionsCheckbox: false
    });

    // // Reply plugin
    self.target.annotator('addPlugin', 'Comment');

    // Storage plugin
    self.target.annotator('addPlugin', 'Store', {
      prefix: self.settings.prefix,
      urls: self.settings.urls,
      history: self.settings.history
    });

    // Errata plugin
    self.target.annotator('addPlugin', 'Errata');

    // Auto-sync inline comments in background
    self.target.off('.Annotator');
    self.target.on('afterAnnotationsLoaded.Annotator', function(evt, data){
      data = data ? data : [];
      self.worker.start(self.settings.autoSync, self.settings.worker, data, function(data){
        if(data.length){
          return self.sync(data);
        }
      });
    });

    self.target.on('annotationErrataUpdated.Annotator', function(evt, data){
      if(!data.length){
        data = [data];
      }
      self.worker.filter(data);
    });

  },

  sync: function(data){
    var self = this;
    self.target.annotator('refreshAnnotations', data);
  }
};


jQuery.fn.EEAAnnotator = function(options){
  return this.each(function(){
    var context = jQuery(this);
    var adapter = new EEA.Annotator(context, options);
    context.data('EEAAnnotator', adapter);
  });
};


// EEA Annotator Portlet
EEA.AnnotatorPortlet = function(context, options){
  var self = this;
  self.context = context;
  self.settings = {

  };

  if(options){
    jQuery.extend(self.settings, options);
  }

  self.initialize();
};

EEA.AnnotatorPortlet.prototype = {
  initialize: function(){
    var self = this;
    self.header = self.context.find('.portletHeader');
    self.parent = self.context.parent();
    self.width = self.context.width();
    self.subscribe = self.context.find('.annotator-subscription-button');
    self.authenticator = self.header.find('input[name="_authenticator"]').val();

    self.subscribe.click(function(evt) {
      evt.preventDefault();
      self.onSubscribe(evt);
    });

    // Handle Events
    var errata = self.context.find('.annotator-errata');
    errata.off('.AnnotatorPortlet');
    errata.on('beforeClick.AnnotatorPortlet', function(evt, data){
      if(self.context.hasClass('fullscreen')){
        return self.highlight(data.annotation, data.element);
      }else{
        return self.fullscreen(data.annotation, data.element);
      }
    });

    errata.on('annotationsErrataLoaded.AnnotatorPortlet', function(evt, data){
      EEA.eea_accordion(errata);
    });

    // Fullscreen button
    jQuery('<a>')
      .addClass('annotator-fullscreen-button')
      .attr('title', 'Toggle Full Screen Mode')
      .html(
        jQuery('<span>')
          .addClass('eea-icon')
          .addClass('eea-icon-expand')
      ).prependTo(self.header);

    self.header.find('.annotator-fullscreen-button').click(function(evt){
      evt.preventDefault();
      self.fullscreen();
    });

    jQuery('.annotator-portlet').on('commentCollapsed', '.erratum-comment', function(evt, data) {
      if (typeof tinymce !== 'undefined' ) {
        var quoted = data.annotation.quote;

        // Split newlines
        quoted = quoted.split('\n');
        var editors = tinymce.editors;

        jQuery.each(editors, function() {
          var cur_ed = this;

          // Clear any existing selection and move cursor to begining of tinymce content
          cur_ed.selection.select(cur_ed.getBody(), true);
          cur_ed.selection.collapse(true);

          var start_range;
          var selection = cur_ed.selection;

          for (var idx = 0, len = quoted.length; idx < len; idx++) {
            if (quoted[idx].length > 0) {

              var ed_win = cur_ed.getWin();
              var found = ed_win.find(quoted[idx]);

              if (found === true) {
                var current = selection.getRng();

                var container_panel = $('#' + cur_ed.editorId).closest('.formPanel');
                var tab_id = container_panel.find('legend').attr('id');
                jQuery('a#' + tab_id).click();

                // scroll to tinymce
                jQuery('html, body').animate({
                  scrollTop: jQuery('#' + cur_ed.editorId).parent().offset().top
                });

                cur_ed.focus();

                // Get the range for the first element - start_range
                if (idx === 0) {
                  start_range = current.cloneRange();
                }

                // Add to the start_range the current range container and endOffset
                start_range.setEnd(current.startContainer, current.endOffset);
                selection.setRng(start_range);
              }
            }
          }
        });
      }
    });

    jQuery('.annotator-portlet').on('commentUnCollapsed', '.erratum-comment', function(evt, data) {
      if (typeof tinymce !== 'undefined' ) {
        var ed = tinymce.activeEditor;

        // Move caret to beginning of text
        ed.execCommand('SelectAll');
        ed.selection.collapse(true);
      }
    });

    jQuery('.annotator-portlet').on('portletEnterFS', function(evt) {
      var self = jQuery(this);
      var portletHeader = self.find('.portletHeader');
      var slider_width = self.outerWidth(true);
      var vert_mid = jQuery(window).scrollTop() + Math.floor(jQuery(window).height() / 2);

      self.addClass('unslided');

      var slide_div = jQuery('<div />', {
        'class': 'annotator-slide-button slide-right',
        click: function(evt){
          var parent = self;
          var btn = jQuery(this);
          var icon = btn.find('.eea-icon');
          evt.preventDefault();

          if (parent.hasClass('unslided')) {
            parent.animate({'margin-right': '-='+slider_width}, function() {
              parent.css('overflow', 'visible');
              parent.removeClass('unslided').addClass('slided');
              btn.removeClass('slide-right').addClass('slide-left');
              btn.css('right', slider_width);
              icon.removeClass('eea-icon-caret-right').addClass('eea-icon-caret-left');
            });
          } else {
            parent.animate({'margin-right': '+='+slider_width}, function() {
              parent.css('overflow', '');
              parent.removeClass('slided').addClass('unslided');
              btn.removeClass('slide-left').addClass('slide-right');
              icon.removeClass('eea-icon-caret-left').addClass('eea-icon-caret-right');
            });
          }
        }
      });

      var slide_btn = jQuery('<span />', {
        'class': 'eea-icon eea-icon-caret-right eea-icon-2x',
        'title': 'Slide the portlet to the right'
      });

      slide_btn.appendTo(slide_div);
      slide_div.width((slider_width - self.width()) / 2);
      self.append(slide_div);
    });

    jQuery('.annotator-portlet').on('portletExitFS', function(evt) {
      var self = jQuery(this);
      var slide_btn = self.find('.annotator-slide-button');
      slide_btn.remove();
    });
  },

  fullscreen: function(annotation, element){
    var self = this;

    var button = self.header.find('.annotator-fullscreen-button span');
    if(self.context.hasClass('fullscreen')){
      self.context.slideUp(function(){
        button.removeClass('eea-icon-compress');
        button.addClass('eea-icon-expand');
        self.context.removeClass('fullscreen');
        self.context.width('auto');
        self.context.slideDown('fast');
        self.context.trigger('portletExitFS');
      });
    }else{
      self.context.slideUp(function(){
        button.addClass('eea-icon-compress');
        button.removeClass('eea-icon-expand');
        self.context.addClass('fullscreen');
        self.context.width(self.width);
        self.context.slideDown('fast');
        self.highlight(annotation, element);
        if(element && element.position){
          var scrollTop = element.position().top;
          self.context.animate({
            scrollTop: scrollTop
          });
        }
        self.context.trigger('portletEnterFS');
      });
    }
  },

  highlight: function(annotation, element){
    var self = this;
    var highlights = [];
    if(annotation && annotation.highlights){
      highlights = annotation.highlights;
    }
    jQuery('.annotator-hl').removeClass('hover');
    jQuery.each(highlights, function(idx, highlight){
      if(idx === 0){
        var scrollTop = jQuery(highlight).position().top;
        jQuery('html,body').animate({
          scrollTop: scrollTop
        });
      }
      jQuery(highlight).addClass('hover');
    });
  },

  onSubscribe: function(evt){
    var self = this;

    var action = self.subscribe.attr('href');
    jQuery.ajax({
      type: 'post',
      url: action,
      data: {ajax: true},
      beforeSend: function(xhr, settings) {
        xhr.setRequestHeader('X-CSRF-Token', self.authenticator);
      },
      success: function(data){
        self.afterSubscribe(data);
      }
    });
  },

  afterSubscribe: function(msg) {
    var self = this;

    if(self.subscribe.hasClass('annotator-subscribe')){
      self.subscribe
        .removeClass('annotator-subscribe')
        .addClass('annotator-unsubscribe')
        .attr({
          title: self.header.data('unsubscribetitle'),
          href: self.header.data('unsubscribehref')
        });
      self.subscribe.find('.eea-icon').attr({
        "class": self.header.data('unsubscribeicon')
      });
    }else{
      self.subscribe
        .removeClass('annotator-unsubscribe')
        .addClass('annotator-subscribe')
        .attr({
          title: self.header.data('subscribetitle'),
          href: self.header.data('subscribehref')
        });
      self.subscribe.find('.eea-icon').attr({
        "class": self.header.data('subscribeicon')
      });
    }
    Annotator.showNotification(msg, Annotator.Notification.SUCCESS);
  }
};

jQuery.fn.EEAAnnotatorPortlet = function(options){
  return this.each(function(){
    var context = jQuery(this);
    var adapter = new EEA.AnnotatorPortlet(context, options);
    context.data('EEAAnnotatorPortlet', adapter);
  });
};


jQuery(document).ready(function(){

  // Annotator
  var items = jQuery(".eea-annotator");
  if(items.length){
    var baseurl = jQuery('base').attr('href');
    if(!baseurl){
      baseurl = jQuery('body').data('base-url');
    }
    if(baseurl.endsWith("/")){
      baseurl = baseurl.substring(0, baseurl.length - 1);
    }
    var settings = {
      worker: baseurl + '/annotator.api/annotations_view',
      prefix: baseurl + '/annotator.api'
    };

    items.EEAAnnotator(settings);
  }

  // Annotator Portlet
  items = jQuery('.annotator-portlet');
  if(items.length){
    items.EEAAnnotatorPortlet();
  }

});

define("eea.annotator", function(){});

// Generated by CoffeeScript 1.6.3
/*
** Annotator v1.2.8-dev-77d5c68
** https://github.com/okfn/annotator/
**
** Copyright 2012 Aron Carroll, Rufus Pollock, and Nick Stenning.
** Dual licensed under the MIT and GPLv3 licenses.
** https://github.com/okfn/annotator/blob/master/LICENSE
**
** Built at: 2014-12-03 15:47:17Z
*/



/*
//
*/

// Generated by CoffeeScript 1.6.3
var findChild, getNodeName, getNodePosition, simpleXPathJQuery, simpleXPathPure;

simpleXPathJQuery = function(relativeRoot) {
  var jq;
  jq = this.map(function() {
    var elem, idx, path, tagName;
    path = '';
    elem = this;
    while ((elem != null ? elem.nodeType : void 0) === Node.ELEMENT_NODE && elem !== relativeRoot) {
      tagName = elem.tagName.replace(":", "\\:");
      idx = $(elem.parentNode).children(tagName).index(elem) + 1;
      idx = "[" + idx + "]";
      path = "/" + elem.tagName.toLowerCase() + idx + path;
      elem = elem.parentNode;
    }
    return path;
  });
  return jq.get();
};

simpleXPathPure = function(relativeRoot) {
  var getPathSegment, getPathTo, jq, rootNode;
  getPathSegment = function(node) {
    var name, pos;
    name = getNodeName(node);
    pos = getNodePosition(node);
    return "" + name + "[" + pos + "]";
  };
  rootNode = relativeRoot;
  getPathTo = function(node) {
    var xpath;
    xpath = '';
    while (node !== rootNode) {
      if (node == null) {
        throw new Error("Called getPathTo on a node which was not a descendant of @rootNode. " + rootNode);
      }
      xpath = (getPathSegment(node)) + '/' + xpath;
      node = node.parentNode;
    }
    xpath = '/' + xpath;
    xpath = xpath.replace(/\/$/, '');
    return xpath;
  };
  jq = this.map(function() {
    var path;
    path = getPathTo(this);
    return path;
  });
  return jq.get();
};

findChild = function(node, type, index) {
  var child, children, found, name, _i, _len;
  if (!node.hasChildNodes()) {
    throw new Error("XPath error: node has no children!");
  }
  children = node.childNodes;
  found = 0;
  for (_i = 0, _len = children.length; _i < _len; _i++) {
    child = children[_i];
    name = getNodeName(child);
    if (name === type) {
      found += 1;
      if (found === index) {
        return child;
      }
    }
  }
  throw new Error("XPath error: wanted child not found.");
};

getNodeName = function(node) {
  var nodeName;
  nodeName = node.nodeName.toLowerCase();
  switch (nodeName) {
    case "#text":
      return "text()";
    case "#comment":
      return "comment()";
    case "#cdata-section":
      return "cdata-section()";
    default:
      return nodeName;
  }
};

getNodePosition = function(node) {
  var pos, tmp;
  pos = 0;
  tmp = node;
  while (tmp) {
    if (tmp.nodeName === node.nodeName) {
      pos++;
    }
    tmp = tmp.previousSibling;
  }
  return pos;
};

/*
//
*/

// Generated by CoffeeScript 1.6.3
var $, Util, gettext, _gettext, _ref, _t;

gettext = null;

if (typeof Gettext !== "undefined" && Gettext !== null) {
  _gettext = new Gettext({
    domain: "annotator"
  });
  gettext = function(msgid) {
    return _gettext.gettext(msgid);
  };
} else {
  gettext = function(msgid) {
    return msgid;
  };
}

_t = function(msgid) {
  return gettext(msgid);
};

if (!(typeof jQuery !== "undefined" && jQuery !== null ? (_ref = jQuery.fn) != null ? _ref.jquery : void 0 : void 0)) {
  console.error(_t("Annotator requires jQuery: have you included lib/vendor/jquery.js?"));
}

if (!(JSON && JSON.parse && JSON.stringify)) {
  console.error(_t("Annotator requires a JSON implementation: have you included lib/vendor/json2.js?"));
}

$ = jQuery;

Util = {};

Util.flatten = function(array) {
  var flatten;
  flatten = function(ary) {
    var el, flat, _i, _len;
    flat = [];
    for (_i = 0, _len = ary.length; _i < _len; _i++) {
      el = ary[_i];
      flat = flat.concat(el && $.isArray(el) ? flatten(el) : el);
    }
    return flat;
  };
  return flatten(array);
};

Util.contains = function(parent, child) {
  var node;
  node = child;
  while (node != null) {
    if (node === parent) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
};

Util.getTextNodes = function(jq) {
  var getTextNodes;
  getTextNodes = function(node) {
    var nodes;
    if (node && node.nodeType !== Node.TEXT_NODE) {
      nodes = [];
      if (node.nodeType !== Node.COMMENT_NODE) {
        node = node.lastChild;
        while (node) {
          nodes.push(getTextNodes(node));
          node = node.previousSibling;
        }
      }
      return nodes.reverse();
    } else {
      return node;
    }
  };
  return jq.map(function() {
    return Util.flatten(getTextNodes(this));
  });
};

Util.getLastTextNodeUpTo = function(n) {
  var result;
  switch (n.nodeType) {
    case Node.TEXT_NODE:
      return n;
    case Node.ELEMENT_NODE:
      if (n.lastChild != null) {
        result = Util.getLastTextNodeUpTo(n.lastChild);
        if (result != null) {
          return result;
        }
      }
      break;
  }
  n = n.previousSibling;
  if (n != null) {
    return Util.getLastTextNodeUpTo(n);
  } else {
    return null;
  }
};

Util.getFirstTextNodeNotBefore = function(n) {
  var result;
  switch (n.nodeType) {
    case Node.TEXT_NODE:
      return n;
    case Node.ELEMENT_NODE:
      if (n.firstChild != null) {
        result = Util.getFirstTextNodeNotBefore(n.firstChild);
        if (result != null) {
          return result;
        }
      }
      break;
  }
  n = n.nextSibling;
  if (n != null) {
    return Util.getFirstTextNodeNotBefore(n);
  } else {
    return null;
  }
};

Util.readRangeViaSelection = function(range) {
  var sel;
  sel = Util.getGlobal().getSelection();
  sel.removeAllRanges();
  sel.addRange(range.toRange());
  return sel.toString();
};

Util.xpathFromNode = function(el, relativeRoot) {
  var exception, result;
  try {
    result = simpleXPathJQuery.call(el, relativeRoot);
  } catch (_error) {
    exception = _error;
    console.log("jQuery-based XPath construction failed! Falling back to manual.");
    result = simpleXPathPure.call(el, relativeRoot);
  }
  return result;
};

Util.nodeFromXPath = function(xp, root) {
  var idx, name, node, step, steps, _i, _len, _ref1;
  steps = xp.substring(1).split("/");
  node = root;
  for (_i = 0, _len = steps.length; _i < _len; _i++) {
    step = steps[_i];
    _ref1 = step.split("["), name = _ref1[0], idx = _ref1[1];
    idx = idx != null ? parseInt((idx != null ? idx.split("]") : void 0)[0]) : 1;
    node = findChild(node, name.toLowerCase(), idx);
  }
  return node;
};

Util.escape = function(html) {
  return html.replace(/&(?!\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

Util.uuid = (function() {
  var counter;
  counter = 0;
  return function() {
    return counter++;
  };
})();

Util.getGlobal = function() {
  return (function() {
    return this;
  })();
};

Util.maxZIndex = function($elements) {
  var all, el;
  all = (function() {
    var _i, _len, _results;
    _results = [];
    for (_i = 0, _len = $elements.length; _i < _len; _i++) {
      el = $elements[_i];
      if ($(el).css('position') === 'static') {
        _results.push(-1);
      } else {
        _results.push(parseInt($(el).css('z-index'), 10) || -1);
      }
    }
    return _results;
  })();
  return Math.max.apply(Math, all);
};

Util.mousePosition = function(e, offsetEl) {
  var offset, _ref1;
  if ((_ref1 = $(offsetEl).css('position')) !== 'absolute' && _ref1 !== 'fixed' && _ref1 !== 'relative') {
    offsetEl = $(offsetEl).offsetParent()[0];
  }
  offset = $(offsetEl).offset();
  return {
    top: e.pageY - offset.top,
    left: e.pageX - offset.left
  };
};

Util.preventEventDefault = function(event) {
  return event != null ? typeof event.preventDefault === "function" ? event.preventDefault() : void 0 : void 0;
};

Util.days = ['Sun', 'Mon', 'Tue', 'Wen', 'Thu', 'Fri', 'Sat'];

Util.checkTime = function(time) {
  if (time < 10) {
    time = "0" + time;
  }
  return time;
};

Util.dateString = function(date) {
  var day, hour, min;
  day = this.days[date.getDay()];
  hour = this.checkTime(date.getHours());
  min = this.checkTime(date.getMinutes());
  return day + ' ' + hour + ':' + min;
};

Util.userString = function(user) {
  var userString;
  if (user) {
    if (user.id) {
      userString = '@' + user.id;
    } else {
      userString = '@' + user;
    }
  } else {
    userString = '';
  }
  return userString;
};

Util.userTitle = function(user) {
  var userTitle;
  if (user) {
    if (user.name) {
      userTitle = user.name;
    } else if (user.id) {
      userTitle = user.id;
    } else {
      userTitle = user;
    }
  } else {
    userTitle = '';
  }
  return userTitle;
};

Util.easyDate = function(date) {
  var days, delta, hours, min, months, now, prefix, weeks, years;
  now = new Date();
  delta = (now - date) / 1000;
  prefix = '~';
  if (delta < 60) {
    return 'just now';
  }
  if (delta < 120) {
    return prefix + '1m ago';
  }
  if (delta < 3300) {
    min = parseInt(delta / 60, 10);
    return prefix + min + 'm ago';
  }
  if (delta < 7200) {
    return prefix + '1h ago';
  }
  if (delta < 72000) {
    hours = parseInt(delta / 3600, 10);
    return prefix + hours + 'h ago';
  }
  delta = delta / 3600;
  if (delta < 48) {
    return prefix + '1d ago';
  }
  if (delta < 160) {
    days = parseInt(delta / 24, 10);
    return prefix + days + 'd ago';
  }
  if (delta < 336) {
    return prefix + '1w ago';
  }
  if (delta < 720) {
    weeks = parseInt(delta / 24 / 7, 10);
    return prefix + weeks + 'w ago';
  }
  delta = delta / 24;
  if (delta < 60) {
    return prefix + '1mo ago';
  }
  if (delta < 360) {
    months = parseInt(delta / 30, 10);
    return prefix + months + 'mo ago';
  }
  if (delta < 720) {
    return prefix + '1y ago';
  }
  if (delta > 720) {
    years = parseInt(delta / 360, 10);
    return prefix + years + 'y ago';
  }
};

Util.prettyDateString = function(date) {
  var day, day_in_month, hour, month, months, weekdays, year;
  weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  day = weekdays[date.getDay()];
  month = months[date.getMonth()];
  day_in_month = date.getDate();
  year = date.getFullYear();
  hour = date.toTimeString().split(' ')[0];
  return day + ', ' + day_in_month + ' ' + month + ' ' + year + ' at ' + hour;
};

/*
//
*/

// Generated by CoffeeScript 1.6.3
var fn, functions, _i, _j, _len, _len1,
  __slice = [].slice;

functions = ["log", "debug", "info", "warn", "exception", "assert", "dir", "dirxml", "trace", "group", "groupEnd", "groupCollapsed", "time", "timeEnd", "profile", "profileEnd", "count", "clear", "table", "error", "notifyFirebug", "firebug", "userObjects"];

if (typeof console !== "undefined" && console !== null) {
  if (console.group == null) {
    console.group = function(name) {
      return console.log("GROUP: ", name);
    };
  }
  if (console.groupCollapsed == null) {
    console.groupCollapsed = console.group;
  }
  for (_i = 0, _len = functions.length; _i < _len; _i++) {
    fn = functions[_i];
    if (console[fn] == null) {
      console[fn] = function() {
        return console.log(_t("Not implemented:") + (" console." + name));
      };
    }
  }
} else {
  this.console = {};
  for (_j = 0, _len1 = functions.length; _j < _len1; _j++) {
    fn = functions[_j];
    this.console[fn] = function() {};
  }
  this.console['error'] = function() {
    var args;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return alert("ERROR: " + (args.join(', ')));
  };
  this.console['warn'] = function() {
    var args;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return alert("WARNING: " + (args.join(', ')));
  };
}

/*
//
*/

// Generated by CoffeeScript 1.6.3
var Delegator,
  __slice = [].slice,
  __hasProp = {}.hasOwnProperty;

Delegator = (function() {
  Delegator.prototype.events = {};

  Delegator.prototype.options = {};

  Delegator.prototype.element = null;

  function Delegator(element, options) {
    this.options = $.extend(true, {}, this.options, options);
    this.element = $(element);
    this._closures = {};
    this.on = this.subscribe;
    this.addEvents();
  }

  Delegator.prototype.addEvents = function() {
    var event, _i, _len, _ref, _results;
    _ref = Delegator._parseEvents(this.events);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      event = _ref[_i];
      _results.push(this._addEvent(event.selector, event.event, event.functionName));
    }
    return _results;
  };

  Delegator.prototype.removeEvents = function() {
    var event, _i, _len, _ref, _results;
    _ref = Delegator._parseEvents(this.events);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      event = _ref[_i];
      _results.push(this._removeEvent(event.selector, event.event, event.functionName));
    }
    return _results;
  };

  Delegator.prototype._addEvent = function(selector, event, functionName) {
    var closure,
      _this = this;
    closure = function() {
      return _this[functionName].apply(_this, arguments);
    };
    if (selector === '' && Delegator._isCustomEvent(event)) {
      this.subscribe(event, closure);
    } else {
      this.element.delegate(selector, event, closure);
    }
    this._closures["" + selector + "/" + event + "/" + functionName] = closure;
    return this;
  };

  Delegator.prototype._removeEvent = function(selector, event, functionName) {
    var closure;
    closure = this._closures["" + selector + "/" + event + "/" + functionName];
    if (selector === '' && Delegator._isCustomEvent(event)) {
      this.unsubscribe(event, closure);
    } else {
      this.element.undelegate(selector, event, closure);
    }
    delete this._closures["" + selector + "/" + event + "/" + functionName];
    return this;
  };

  Delegator.prototype.publish = function() {
    this.element.triggerHandler.apply(this.element, arguments);
    return this;
  };

  Delegator.prototype.subscribe = function(event, callback) {
    var closure;
    closure = function() {
      return callback.apply(this, [].slice.call(arguments, 1));
    };
    closure.guid = callback.guid = ($.guid += 1);
    this.element.bind(event, closure);
    return this;
  };

  Delegator.prototype.unsubscribe = function() {
    this.element.unbind.apply(this.element, arguments);
    return this;
  };

  return Delegator;

})();

Delegator._parseEvents = function(eventsObj) {
  var event, events, functionName, sel, selector, _i, _ref;
  events = [];
  for (sel in eventsObj) {
    functionName = eventsObj[sel];
    _ref = sel.split(' '), selector = 2 <= _ref.length ? __slice.call(_ref, 0, _i = _ref.length - 1) : (_i = 0, []), event = _ref[_i++];
    events.push({
      selector: selector.join(' '),
      event: event,
      functionName: functionName
    });
  }
  return events;
};

Delegator.natives = (function() {
  var key, specials, val;
  specials = (function() {
    var _ref, _results;
    _ref = jQuery.event.special;
    _results = [];
    for (key in _ref) {
      if (!__hasProp.call(_ref, key)) continue;
      val = _ref[key];
      _results.push(key);
    }
    return _results;
  })();
  return "blur focus focusin focusout load resize scroll unload click dblclick\nmousedown mouseup mousemove mouseover mouseout mouseenter mouseleave\nchange select submit keydown keypress keyup error".split(/[^a-z]+/).concat(specials);
})();

Delegator._isCustomEvent = function(event) {
  event = event.split('.')[0];
  return $.inArray(event, Delegator.natives) === -1;
};

/*
//
*/

// Generated by CoffeeScript 1.6.3
var Range,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

if (typeof String.prototype.startsWith !== 'function') {
  String.prototype.startsWith = function(str) {
    return this.slice(0, str.length) === str;
  };
}

if (typeof String.prototype.endsWith !== "function") {
  String.prototype.endsWith = function(str) {
    return this.slice(-str.length) === str;
  };
}

if (window.Range === void 0) {
  Range = {};
  Range.prototype = {};
}

Range.sniff = function(r) {
  if (r.commonAncestorContainer != null) {
    return new Range.BrowserRange(r);
  } else if (typeof r.start === "string") {
    return new Range.SerializedRange(r);
  } else if (r.start && typeof r.start === "object") {
    return new Range.NormalizedRange(r);
  } else {
    console.error(_t("Could not sniff range type"));
    return false;
  }
};

Range.nodeFromXPath = function(xpath, root, matchText, offset, otype) {
  var customResolver, evaluateXPath, found, index, myindex, n, namespace, newOffset, node, segment, text, xp, _i, _len;
  if (root == null) {
    root = document;
  }
  if (matchText == null) {
    matchText = null;
  }
  if (offset == null) {
    offset = null;
  }
  if (otype == null) {
    otype = "start";
  }
  evaluateXPath = function(xp, nsResolver) {
    var exception;
    if (nsResolver == null) {
      nsResolver = null;
    }
    try {
      return document.evaluate('.' + xp, root, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    } catch (_error) {
      exception = _error;
      console.log("XPath evaluation failed.");
      console.log("Trying fallback...");
      return Util.nodeFromXPath(xp, root);
    }
  };
  if (!$.isXMLDoc(document.documentElement)) {
    node = evaluateXPath(xpath);
  } else {
    customResolver = document.createNSResolver(document.ownerDocument === null ? document.documentElement : document.ownerDocument.documentElement);
    node = evaluateXPath(xpath, customResolver);
    if (!node) {
      xpath = ((function() {
        var _i, _len, _ref, _results;
        _ref = xpath.split('/');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          segment = _ref[_i];
          if (segment && segment.indexOf(':') === -1) {
            _results.push(segment.replace(/^([a-z]+)/, 'xhtml:$1'));
          } else {
            _results.push(segment);
          }
        }
        return _results;
      })()).join('/');
      namespace = document.lookupNamespaceURI(null);
      customResolver = function(ns) {
        if (ns === 'xhtml') {
          return namespace;
        } else {
          return document.documentElement.getAttribute('xmlns:' + ns);
        }
      };
      node = evaluateXPath(xpath, customResolver);
    }
  }
  if (node && matchText) {
    text = $(node).text().toLowerCase().replace(/\xA0/g, " ");
    newOffset = text.indexOf(matchText);
    $(node).removeData(otype + 'Offset');
    if (otype === 'end') {
      newOffset += matchText.length;
    }
    if (newOffset === -1) {
      node = null;
    }
    if ($.isNumeric(offset) && newOffset !== offset) {
      node = null;
    }
  }
  if (!node && matchText) {
    xp = xpath.replace(/\[[0-9]+\]/g, "").replace(/\//g, " ").trim();
    xp = xp.replace(/\sstrong$/g, '').replace(/\sb$/g, '').replace('\sem$/g', '').replace('\si$/g', '');
    node = $(root).find("" + xp).filter(function() {
      text = $(this).text().toLowerCase().replace(/\xA0/g, " ");
      return text.indexOf(matchText) !== -1;
    });
    if (node.length === 0) {
      node = null;
    } else if (node.length === 1) {
      node = node[0];
      text = $(node).text().toLowerCase().replace(/\xA0/g, " ");
      newOffset = text.indexOf(matchText);
      if (otype === 'end') {
        newOffset += matchText.length;
      }
      if ($.isNumeric(offset) && newOffset !== offset) {
        $(node).data(otype + 'Offset', newOffset);
      } else {
        $(node).removeData(otype + 'Offset');
      }
    } else {
      if (!$.isNumeric(offset)) {
        offset = 0;
      }
      found = null;
      index = Number.MAX_VALUE;
      for (_i = 0, _len = node.length; _i < _len; _i++) {
        n = node[_i];
        text = $(n).text().toLowerCase().replace(/\xA0/g, " ");
        newOffset = text.indexOf(matchText);
        if (otype === 'end') {
          newOffset += matchText.length;
        }
        myindex = Math.abs(newOffset - offset);
        if (myindex < index) {
          index = myindex;
          found = n;
          if (newOffset !== offset) {
            $(n).data(otype + 'Offset', newOffset);
          } else {
            $(n).removeData(otype + 'Offset');
          }
        }
      }
      node = found;
    }
  }
  return node;
};

Range.RangeError = (function(_super) {
  __extends(RangeError, _super);

  function RangeError(type, message, parent) {
    this.type = type;
    this.message = message;
    this.parent = parent != null ? parent : null;
    RangeError.__super__.constructor.call(this, this.message);
  }

  return RangeError;

})(Error);

Range.BrowserRange = (function() {
  function BrowserRange(obj) {
    this.commonAncestorContainer = obj.commonAncestorContainer;
    this.startContainer = obj.startContainer;
    this.startOffset = obj.startOffset;
    this.endContainer = obj.endContainer;
    this.endOffset = obj.endOffset;
  }

  BrowserRange.prototype.normalize = function(root, matchText) {
    var endText, n, node, nr, r, startText;
    if (this.tainted) {
      console.error(_t("You may only call normalize() once on a BrowserRange!"));
      return false;
    } else {
      this.tainted = true;
    }
    r = {};
    if (this.startContainer.nodeType === Node.ELEMENT_NODE) {
      r.start = Util.getFirstTextNodeNotBefore(this.startContainer.childNodes[this.startOffset]);
      r.startOffset = 0;
    } else {
      r.start = this.startContainer;
      r.startOffset = this.startOffset;
    }
    if (this.endContainer.nodeType === Node.ELEMENT_NODE) {
      node = this.endContainer.childNodes[this.endOffset];
      if (node != null) {
        n = node;
        while ((n != null) && (n.nodeType !== Node.TEXT_NODE)) {
          n = n.firstChild;
        }
        if (n != null) {
          r.end = n;
          r.endOffset = 0;
        }
      }
      if (r.end == null) {
        node = this.endContainer.childNodes[this.endOffset - 1];
        r.end = Util.getLastTextNodeUpTo(node);
        r.endOffset = r.end.nodeValue.length;
      }
    } else {
      r.end = this.endContainer;
      r.endOffset = this.endOffset;
    }
    nr = {};
    if (r.startOffset > 0) {
      if (r.start.nodeValue.length > r.startOffset) {
        nr.start = r.start.splitText(r.startOffset);
      } else {
        nr.start = r.start.nextSibling;
      }
    } else {
      nr.start = r.start;
    }
    if (r.start === r.end) {
      if (nr.start.nodeValue.length > (r.endOffset - r.startOffset)) {
        nr.start.splitText(r.endOffset - r.startOffset);
      }
      nr.end = nr.start;
    } else {
      if (r.end.nodeValue.length > r.endOffset) {
        r.end.splitText(r.endOffset);
      }
      nr.end = r.end;
    }
    nr.commonAncestor = this.commonAncestorContainer;
    while (nr.commonAncestor.nodeType !== Node.ELEMENT_NODE) {
      nr.commonAncestor = nr.commonAncestor.parentNode;
    }
    startText = nr.start.textContent.trim().toLowerCase().replace(/\xA0/g, " ");
    endText = nr.end.textContent.trim().toLowerCase().replace(/\xA0/g, " ");
    if (!matchText) {
      return new Range.NormalizedRange(nr);
    } else if (matchText.startsWith(startText) && matchText.endsWith(endText)) {
      return new Range.NormalizedRange(nr);
    } else {
      throw new Range.RangeError("Exact match enabled. Couldn't find text: " + matchText);
    }
  };

  BrowserRange.prototype.serialize = function(root, ignoreSelector) {
    return this.normalize(root).serialize(root, ignoreSelector);
  };

  return BrowserRange;

})();

Range.NormalizedRange = (function() {
  function NormalizedRange(obj) {
    this.commonAncestor = obj.commonAncestor;
    this.start = obj.start;
    this.end = obj.end;
  }

  NormalizedRange.prototype.normalize = function(root, matchText) {
    return this;
  };

  NormalizedRange.prototype.limit = function(bounds) {
    var nodes, parent, startParents, _i, _len, _ref;
    nodes = $.grep(this.textNodes(), function(node) {
      return node.parentNode === bounds || $.contains(bounds, node.parentNode);
    });
    if (!nodes.length) {
      return null;
    }
    this.start = nodes[0];
    this.end = nodes[nodes.length - 1];
    startParents = $(this.start).parents();
    _ref = $(this.end).parents();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      parent = _ref[_i];
      if (startParents.index(parent) !== -1) {
        this.commonAncestor = parent;
        break;
      }
    }
    return this;
  };

  NormalizedRange.prototype.serialize = function(root, ignoreSelector) {
    var end, serialization, start;
    serialization = function(node, isEnd) {
      var n, nodes, offset, origParent, textNodes, xpath, _i, _len;
      if (ignoreSelector) {
        origParent = $(node).parents(":not(" + ignoreSelector + ")").eq(0);
      } else {
        origParent = $(node).parent();
      }
      xpath = Util.xpathFromNode(origParent, root)[0];
      textNodes = Util.getTextNodes(origParent);
      nodes = textNodes.slice(0, textNodes.index(node));
      offset = 0;
      for (_i = 0, _len = nodes.length; _i < _len; _i++) {
        n = nodes[_i];
        offset += n.nodeValue.length;
      }
      if (isEnd) {
        return [xpath, offset + node.nodeValue.length];
      } else {
        return [xpath, offset];
      }
    };
    start = serialization(this.start);
    end = serialization(this.end, true);
    return new Range.SerializedRange({
      start: start[0],
      end: end[0],
      startOffset: start[1],
      endOffset: end[1]
    });
  };

  NormalizedRange.prototype.text = function() {
    var node;
    return ((function() {
      var _i, _len, _ref, _results;
      _ref = this.textNodes();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        _results.push(node.nodeValue);
      }
      return _results;
    }).call(this)).join('');
  };

  NormalizedRange.prototype.textNodes = function() {
    var end, start, textNodes, _ref;
    textNodes = Util.getTextNodes($(this.commonAncestor));
    _ref = [textNodes.index(this.start), textNodes.index(this.end)], start = _ref[0], end = _ref[1];
    return $.makeArray(textNodes.slice(start, +end + 1 || 9e9));
  };

  NormalizedRange.prototype.toRange = function() {
    var range;
    range = document.createRange();
    range.setStartBefore(this.start);
    range.setEndAfter(this.end);
    return range;
  };

  return NormalizedRange;

})();

Range.SerializedRange = (function() {
  function SerializedRange(obj) {
    this.start = obj.start;
    this.startOffset = obj.startOffset;
    this.end = obj.end;
    this.endOffset = obj.endOffset;
  }

  SerializedRange.prototype.normalize = function(root, matchText) {
    var contains, e, length, matching, newOffset, node, p, range, targetOffset, texts, tn, _i, _j, _len, _len1, _ref, _ref1;
    range = {};
    matching = {
      start: null,
      end: null
    };
    if (matchText) {
      texts = $.map(matchText.split('\n'), function(text, idx) {
        var tex;
        tex = text.trim();
        if (tex.length) {
          return tex;
        } else {
          return null;
        }
      });
      matching.start = $(texts).first()[0].toLowerCase();
      matching.end = $(texts).last()[0].toLowerCase();
    }
    _ref = ['start', 'end'];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      p = _ref[_i];
      try {
        node = Range.nodeFromXPath(this[p], root, matching[p], this[p + 'Offset'], p);
      } catch (_error) {
        e = _error;
        throw new Range.RangeError(p, ("Error while finding " + p + " node: " + this[p] + ": ") + e, e);
      }
      if (!node) {
        throw new Range.RangeError(p, "Couldn't find " + p + " node: " + this[p]);
      }
      newOffset = $(node).data(p + 'Offset');
      if ($.isNumeric(newOffset)) {
        this[p + 'Offset'] = newOffset;
      }
      length = 0;
      targetOffset = this[p + 'Offset'];
      if (p === 'end') {
        targetOffset--;
      }
      _ref1 = Util.getTextNodes($(node));
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        tn = _ref1[_j];
        if (length + tn.nodeValue.length > targetOffset) {
          range[p + 'Container'] = tn;
          range[p + 'Offset'] = this[p + 'Offset'] - length;
          break;
        } else {
          length += tn.nodeValue.length;
        }
      }
      if (range[p + 'Offset'] == null) {
        throw new Range.RangeError("" + p + "offset", "Couldn't find offset " + this[p + 'Offset'] + " in element " + this[p]);
      }
    }
    contains = document.compareDocumentPosition == null ? function(a, b) {
      return a.contains(b);
    } : function(a, b) {
      return a.compareDocumentPosition(b) & 16;
    };
    $(range.startContainer).parents().each(function() {
      if (contains(this, range.endContainer)) {
        range.commonAncestorContainer = this;
        return false;
      }
    });
    return new Range.BrowserRange(range).normalize(root, matchText);
  };

  SerializedRange.prototype.serialize = function(root, ignoreSelector) {
    return this.normalize(root).serialize(root, ignoreSelector);
  };

  SerializedRange.prototype.toObject = function() {
    return {
      start: this.start,
      startOffset: this.startOffset,
      end: this.end,
      endOffset: this.endOffset
    };
  };

  return SerializedRange;

})();

/*
//
*/

// Generated by CoffeeScript 1.6.3
var Annotator, g, _Annotator, _ref,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

if (!jQuery.fn.addBack) {
  jQuery.fn.addBack = jQuery.fn.andSelf;
}

_Annotator = this.Annotator;

Annotator = (function(_super) {
  __extends(Annotator, _super);

  Annotator.prototype.events = {
    ".annotator-adder button click": "onAdderClick",
    ".annotator-adder button mousedown": "onAdderMousedown",
    ".annotator-hl mouseover": "onHighlightMouseover",
    ".annotator-hl mouseout": "startViewerHideTimer"
  };

  Annotator.prototype.html = {
    adder: '<div class="annotator-adder"><button>' + _t('Annotate') + '</button></div>',
    adderWarning: '<div class="annotator-adder-warning"></div>',
    wrapper: '<div class="annotator-wrapper"></div>'
  };

  Annotator.prototype.options = {
    readOnly: false,
    exactMatch: false,
    noDuplicates: false,
    authenticator: "",
    minWords: 0
  };

  Annotator.prototype.plugins = {};

  Annotator.prototype.editor = null;

  Annotator.prototype.viewer = null;

  Annotator.prototype.selectedRanges = null;

  Annotator.prototype.mouseIsDown = false;

  Annotator.prototype.ignoreMouseup = false;

  Annotator.prototype.viewerHideTimer = null;

  function Annotator(element, options) {
    this.onDeleteAnnotation = __bind(this.onDeleteAnnotation, this);
    this.onEditAnnotation = __bind(this.onEditAnnotation, this);
    this.onAdderClick = __bind(this.onAdderClick, this);
    this.onAdderMousedown = __bind(this.onAdderMousedown, this);
    this.onHighlightMouseover = __bind(this.onHighlightMouseover, this);
    this.checkForEndSelection = __bind(this.checkForEndSelection, this);
    this.checkForStartSelection = __bind(this.checkForStartSelection, this);
    this.checkForErrors = __bind(this.checkForErrors, this);
    this.clearViewerHideTimer = __bind(this.clearViewerHideTimer, this);
    this.startViewerHideTimer = __bind(this.startViewerHideTimer, this);
    this.showViewer = __bind(this.showViewer, this);
    this.onEditorSubmit = __bind(this.onEditorSubmit, this);
    this.onEditorHide = __bind(this.onEditorHide, this);
    this.showEditor = __bind(this.showEditor, this);
    Annotator.__super__.constructor.apply(this, arguments);
    this.plugins = {};
    if (!Annotator.supported()) {
      return this;
    }
    if (!this.options.readOnly) {
      this._setupDocumentEvents();
    }
    this._setupWrapper()._setupViewer()._setupEditor();
    this._setupDynamicStyle();
    this.adder = $(this.html.adder).appendTo(this.wrapper).hide();
    this.adderWarning = $(this.html.adderWarning).appendTo(this.wrapper).hide();
    Annotator._instances.push(this);
  }

  Annotator.prototype._setupWrapper = function() {
    this.wrapper = $(this.html.wrapper);
    this.element.find('script').remove();
    this.element.wrapInner(this.wrapper);
    this.wrapper = this.element.find('.annotator-wrapper');
    return this;
  };

  Annotator.prototype._setupViewer = function() {
    var _this = this;
    this.viewer = new Annotator.Viewer({
      readOnly: this.options.readOnly
    });
    this.viewer.hide().on("edit", this.onEditAnnotation).on("delete", this.onDeleteAnnotation).addField({
      load: function(field, annotation) {
        if (annotation.text) {
          $(field).html(Util.escape(annotation.text));
        } else {
          $(field).html("<i>" + (_t('No Comment')) + "</i>");
        }
        return _this.publish('annotationViewerTextField', [field, annotation]);
      }
    }).element.appendTo(this.wrapper).bind({
      "mouseover": this.clearViewerHideTimer,
      "mouseout": this.startViewerHideTimer
    });
    return this;
  };

  Annotator.prototype._setupEditor = function() {
    this.editor = new Annotator.Editor();
    this.editor.hide().on('hide', this.onEditorHide).on('save', this.onEditorSubmit).addField({
      type: 'textarea',
      label: _t('Comments') + '\u2026',
      load: function(field, annotation) {
        return $(field).find('textarea').val(annotation.text || '');
      },
      submit: function(field, annotation) {
        return annotation.text = $(field).find('textarea').val();
      }
    });
    this.editor.element.appendTo(this.wrapper);
    return this;
  };

  Annotator.prototype._setupDocumentEvents = function() {
    $(document).bind({
      "mouseup": this.checkForEndSelection,
      "mousedown": this.checkForStartSelection
    });
    return this;
  };

  Annotator.prototype._setupDynamicStyle = function() {
    var max, sel, style, x;
    style = $('#annotator-dynamic-style');
    if (!style.length) {
      style = $('<style id="annotator-dynamic-style"></style>').appendTo(document.head);
    }
    sel = '*' + ((function() {
      var _i, _len, _ref, _results;
      _ref = ['adder', 'outer', 'notice', 'filter'];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        x = _ref[_i];
        _results.push(":not(.annotator-" + x + ")");
      }
      return _results;
    })()).join('');
    max = Util.maxZIndex($(document.body).find(sel));
    max = Math.max(max, 1000);
    style.text([".annotator-adder, .annotator-outer, .annotator-notice {", "  z-index: " + (max + 20) + ";", "}", ".annotator-filter {", "  z-index: " + (max + 10) + ";", "}"].join("\n"));
    return this;
  };

  Annotator.prototype.destroy = function() {
    var idx, name, plugin, _ref;
    $(document).unbind({
      "mouseup": this.checkForEndSelection,
      "mousedown": this.checkForStartSelection
    });
    $('#annotator-dynamic-style').remove();
    this.adder.remove();
    this.viewer.destroy();
    this.editor.destroy();
    this.wrapper.find('.annotator-hl').each(function() {
      $(this).contents().insertBefore(this);
      return $(this).remove();
    });
    this.wrapper.contents().insertBefore(this.wrapper);
    this.wrapper.remove();
    this.element.data('annotator', null);
    _ref = this.plugins;
    for (name in _ref) {
      plugin = _ref[name];
      this.plugins[name].destroy();
    }
    this.removeEvents();
    idx = Annotator._instances.indexOf(this);
    if (idx !== -1) {
      return Annotator._instances.splice(idx, 1);
    }
  };

  Annotator.prototype.getSelectedRanges = function() {
    var browserRange, i, normedRange, r, ranges, rangesToIgnore, selection, _i, _len;
    selection = Util.getGlobal().getSelection();
    ranges = [];
    rangesToIgnore = [];
    if (!selection.isCollapsed) {
      ranges = (function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = 0, _ref = selection.rangeCount; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          r = selection.getRangeAt(i);
          browserRange = new Range.BrowserRange(r);
          normedRange = browserRange.normalize().limit(this.wrapper[0]);
          if (normedRange === null) {
            rangesToIgnore.push(r);
          }
          _results.push(normedRange);
        }
        return _results;
      }).call(this);
      selection.removeAllRanges();
    }
    for (_i = 0, _len = rangesToIgnore.length; _i < _len; _i++) {
      r = rangesToIgnore[_i];
      selection.addRange(r);
    }
    return $.grep(ranges, function(range) {
      if (range) {
        selection.addRange(range.toRange());
      }
      return range;
    });
  };

  Annotator.prototype.createAnnotation = function() {
    var annotation;
    annotation = {};
    this.publish('beforeAnnotationCreated', [annotation]);
    return annotation;
  };

  Annotator.prototype.setupAnnotation = function(annotation) {
    var cssClass, e, matchText, normed, normedRanges, r, root, _i, _j, _len, _len1, _ref;
    root = this.wrapper[0];
    matchText = false;
    if (this.options.exactMatch && annotation.quote) {
      matchText = annotation.quote.toLowerCase().replace(/\xA0/g, " ");
    }
    annotation.ranges || (annotation.ranges = this.selectedRanges);
    normedRanges = [];
    e = null;
    _ref = annotation.ranges;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      r = _ref[_i];
      try {
        normedRanges.push(Range.sniff(r).normalize(root, matchText));
      } catch (_error) {
        e = _error;
        if (e instanceof Range.RangeError) {
          this.publish('rangeNormalizeFail', [annotation, r, e]);
        } else {
          throw e;
        }
      }
    }
    if (!e) {
      annotation.quote = [];
      annotation.ranges = [];
      annotation.highlights = [];
      for (_j = 0, _len1 = normedRanges.length; _j < _len1; _j++) {
        normed = normedRanges[_j];
        annotation.quote.push($.trim(normed.text()));
        annotation.ranges.push(normed.serialize(this.wrapper[0], '.annotator-hl'));
        cssClass = 'annotator-hl';
        if (annotation.deleted) {
          cssClass += ' annotator-hl-deleted';
        }
        $.merge(annotation.highlights, this.highlightRange(normed, cssClass));
      }
      annotation.quote = annotation.quote.join(' / ');
    }
    $(annotation.highlights).data('annotation', annotation);
    return annotation;
  };

  Annotator.prototype.updateAnnotation = function(annotation) {
    this.publish('beforeAnnotationUpdated', [annotation]);
    this.publish('annotationUpdated', [annotation]);
    return annotation;
  };

  Annotator.prototype.deleteAnnotation = function(annotation, storage) {
    var child, h, _i, _len, _ref;
    if (storage == null) {
      storage = true;
    }
    if (annotation.highlights != null) {
      _ref = annotation.highlights;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        h = _ref[_i];
        if (!(h.parentNode != null)) {
          continue;
        }
        child = h.childNodes[0];
        $(h).replaceWith(h.childNodes);
      }
    }
    if (storage) {
      this.publish('annotationDeleted', [annotation]);
    }
    return annotation;
  };

  Annotator.prototype.loadAnnotations = function(annotations) {
    var clone, loader,
      _this = this;
    if (annotations == null) {
      annotations = [];
    }
    loader = function(annList) {
      var n, now, _i, _len;
      if (annList == null) {
        annList = [];
      }
      now = annList.splice(0, 10);
      for (_i = 0, _len = now.length; _i < _len; _i++) {
        n = now[_i];
        _this.setupAnnotation(n);
      }
      if (annList.length > 0) {
        return setTimeout((function() {
          return loader(annList);
        }), 10);
      } else {
        _this.publish('annotationsLoaded', [clone]);
        return _this.publish("afterAnnotationsLoaded", [clone]);
      }
    };
    clone = annotations.slice();
    if (annotations.length) {
      loader(annotations);
    } else {
      this.publish("afterAnnotationsLoaded", []);
    }
    return this;
  };

  Annotator.prototype.refreshAnnotations = function(annotations) {
    var annotation, store, _i, _len, _results;
    if (annotations == null) {
      annotations = [];
    }
    store = this.plugins['Store'];
    if (store) {
      _results = [];
      for (_i = 0, _len = annotations.length; _i < _len; _i++) {
        annotation = annotations[_i];
        _results.push(this.refreshAnnotation(annotation));
      }
      return _results;
    } else {
      console.warn(_t("Can't refresh annotations without Store plugin."));
      return false;
    }
  };

  Annotator.prototype.refreshAnnotation = function(annotation) {
    var deleted, name, old, store, _i, _len, _ref;
    store = this.plugins['Store'];
    if (!store) {
      console.warn(_t("Can't refresh annotations without Store plugin."));
      return false;
    } else {
      name = annotation.id;
      deleted = annotation.deleted;
      _ref = store.annotations;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        old = _ref[_i];
        if (old.id === name) {
          if (deleted !== old.deleted) {
            this.deleteAnnotation(old, false);
            store.updateAnnotation(old, annotation);
            return this.publish("afterAnnotationDeleted", [old]);
          } else {
            store.updateAnnotation(old, annotation);
            return this.publish("afterAnnotationUpdated", [old]);
          }
        }
      }
      annotation = this.setupAnnotation(annotation);
      store.registerAnnotation(annotation);
      store.updateAnnotation(annotation, {});
      return store.publish("afterAnnotationCreated", [annotation]);
    }
  };

  Annotator.prototype.dumpAnnotations = function() {
    if (this.plugins['Store']) {
      return this.plugins['Store'].dumpAnnotations();
    } else {
      console.warn(_t("Can't dump annotations without Store plugin."));
      return false;
    }
  };

  Annotator.prototype.highlightRange = function(normedRange, cssClass) {
    var hl, node, white, _i, _len, _ref, _results;
    if (cssClass == null) {
      cssClass = 'annotator-hl';
    }
    white = /^\s*$/;
    hl = $("<span class='" + cssClass + "'></span>");
    _ref = normedRange.textNodes();
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      node = _ref[_i];
      if (!(!white.test(node.nodeValue))) {
        continue;
      }
      if ($(node).parents('textarea,input').length) {
        continue;
      }
      _results.push($(node).wrapAll(hl).parent().show()[0]);
    }
    return _results;
  };

  Annotator.prototype.highlightRanges = function(normedRanges, cssClass) {
    var highlights, r, _i, _len;
    if (cssClass == null) {
      cssClass = 'annotator-hl';
    }
    highlights = [];
    for (_i = 0, _len = normedRanges.length; _i < _len; _i++) {
      r = normedRanges[_i];
      $.merge(highlights, this.highlightRange(r, cssClass));
    }
    return highlights;
  };

  Annotator.prototype.addPlugin = function(name, options) {
    var klass, _base;
    if (this.plugins[name]) {
      console.error(_t("You cannot have more than one instance of any plugin."));
    } else {
      klass = Annotator.Plugin[name];
      if (typeof klass === 'function') {
        this.plugins[name] = new klass(this.element[0], options);
        this.plugins[name].annotator = this;
        if (typeof (_base = this.plugins[name]).pluginInit === "function") {
          _base.pluginInit();
        }
      } else {
        console.error(_t("Could not load ") + name + _t(" plugin. Have you included the appropriate <script> tag?"));
      }
    }
    return this;
  };

  Annotator.prototype.addField = function(options) {
    this.viewer.addField(options);
    return this;
  };

  Annotator.prototype.showEditor = function(annotation, location) {
    var highlights, position, top;
    highlights = $(annotation.highlights);
    position = highlights.position();
    top = position ? position.top : location.top;
    if (top !== location.top) {
      location.top = top;
    }
    this.editor.element.css(location);
    this.editor.load(annotation);
    this.publish('annotationEditorShown', [this.editor, annotation]);
    return this;
  };

  Annotator.prototype.onEditorHide = function() {
    this.publish('annotationEditorHidden', [this.editor]);
    return this.ignoreMouseup = false;
  };

  Annotator.prototype.onEditorSubmit = function(annotation) {
    return this.publish('annotationEditorSubmit', [this.editor, annotation]);
  };

  Annotator.prototype.showViewer = function(annotations, location) {
    var toShow;
    if (this.editor.isShown()) {
      return false;
    }
    this.viewer.element.css(location);
    toShow = $.grep(annotations, function(annotation, idx) {
      return !annotation.deleted;
    });
    this.viewer.load(toShow);
    return this.publish('annotationViewerShown', [this.viewer, toShow]);
  };

  Annotator.prototype.startViewerHideTimer = function() {
    if (!this.viewerHideTimer) {
      return this.viewerHideTimer = setTimeout(this.viewer.hide, 250);
    }
  };

  Annotator.prototype.clearViewerHideTimer = function() {
    clearTimeout(this.viewerHideTimer);
    return this.viewerHideTimer = false;
  };

  Annotator.prototype.checkForErrors = function(event) {
    var count, minWords, noDuplicates, pattern, selection, text, words;
    selection = $.trim(this.selectedRanges[0].text());
    words = selection.replace(/(?:\r\n|\r|\n)/g, ' ').split(' ');
    minWords = this.options.minWords;
    if (words.length < minWords) {
      return "Select at least " + minWords + " words to add a comment.";
    }
    noDuplicates = this.options.noDuplicates;
    if (!noDuplicates) {
      return;
    }
    text = this.wrapper.text();
    pattern = RegExp(selection, 'gim');
    count = text.match(pattern);
    if (count && count.length > 1) {
      return "Multiple occurrences of selection (" + count.length + "). Refine it to add a comment.";
    }
  };

  Annotator.prototype.checkForStartSelection = function(event) {
    if (!(event && this.isAnnotator(event.target))) {
      this.startViewerHideTimer();
    }
    return this.mouseIsDown = true;
  };

  Annotator.prototype.checkForEndSelection = function(event) {
    var container, errors, range, _i, _len, _ref;
    this.mouseIsDown = false;
    if (this.ignoreMouseup) {
      return;
    }
    this.selectedRanges = this.getSelectedRanges();
    _ref = this.selectedRanges;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      range = _ref[_i];
      container = range.commonAncestor;
      if ($(container).hasClass('annotator-hl')) {
        container = $(container).parents('[class!=annotator-hl]')[0];
      }
      if (this.isAnnotator(container)) {
        return;
      }
    }
    if (event && this.selectedRanges.length) {
      errors = this.checkForErrors(event);
      if (errors) {
        this.adder.hide();
        return this.adderWarning.text(errors).css(Util.mousePosition(event, this.wrapper[0])).fadeIn().delay(2000).fadeOut();
      } else {
        return this.adder.css(Util.mousePosition(event, this.wrapper[0])).show();
      }
    } else {
      return this.adder.hide();
    }
  };

  Annotator.prototype.isAnnotator = function(element) {
    return !!$(element).parents().addBack().filter('[class^=annotator-]').not(this.wrapper).length;
  };

  Annotator.prototype.onHighlightMouseover = function(event) {
    var annotation, annotations, highlight, highlights, _i, _len;
    this.clearViewerHideTimer();
    $('.annotator-hl').removeClass('hover');
    annotation = $(event.target).data('annotation');
    highlights = annotation ? annotation.highlights : [];
    for (_i = 0, _len = highlights.length; _i < _len; _i++) {
      highlight = highlights[_i];
      $(highlight).addClass('hover');
    }
    if (this.mouseIsDown || this.viewer.isShown()) {
      return false;
    }
    annotations = $(event.target).parents('.annotator-hl').addBack().map(function() {
      return $(this).data("annotation");
    });
    return this.showViewer($.makeArray(annotations), Util.mousePosition(event, this.wrapper[0]));
  };

  Annotator.prototype.onAdderMousedown = function(event) {
    if (event != null) {
      event.preventDefault();
    }
    return this.ignoreMouseup = true;
  };

  Annotator.prototype.onAdderClick = function(event) {
    var annotation, cancel, cleanup, position, save,
      _this = this;
    if (event != null) {
      event.preventDefault();
    }
    position = this.adder.position();
    this.adder.hide();
    annotation = this.setupAnnotation(this.createAnnotation());
    $(annotation.highlights).addClass('annotator-hl-temporary');
    save = function() {
      cleanup();
      $(annotation.highlights).removeClass('annotator-hl-temporary');
      return _this.publish('annotationCreated', [annotation]);
    };
    cancel = function() {
      cleanup();
      return _this.deleteAnnotation(annotation);
    };
    cleanup = function() {
      _this.unsubscribe('annotationEditorHidden', cancel);
      return _this.unsubscribe('annotationEditorSubmit', save);
    };
    this.subscribe('annotationEditorHidden', cancel);
    this.subscribe('annotationEditorSubmit', save);
    return this.showEditor(annotation, position);
  };

  Annotator.prototype.onEditAnnotation = function(annotation) {
    var cleanup, offset, update,
      _this = this;
    offset = this.viewer.element.position();
    update = function() {
      cleanup();
      return _this.updateAnnotation(annotation);
    };
    cleanup = function() {
      _this.unsubscribe('annotationEditorHidden', cleanup);
      return _this.unsubscribe('annotationEditorSubmit', update);
    };
    this.subscribe('annotationEditorHidden', cleanup);
    this.subscribe('annotationEditorSubmit', update);
    this.viewer.hide();
    return this.showEditor(annotation, offset);
  };

  Annotator.prototype.onDeleteAnnotation = function(annotation) {
    this.viewer.hide();
    return this.deleteAnnotation(annotation);
  };

  return Annotator;

})(Delegator);

Annotator.Plugin = (function(_super) {
  __extends(Plugin, _super);

  function Plugin(element, options) {
    Plugin.__super__.constructor.apply(this, arguments);
  }

  Plugin.prototype.pluginInit = function() {};

  Plugin.prototype.destroy = function() {
    return this.removeEvents();
  };

  return Plugin;

})(Delegator);

g = Util.getGlobal();

if (((_ref = g.document) != null ? _ref.evaluate : void 0) == null) {
  $.getScript('http://assets.annotateit.org/vendor/xpath.min.js');
}

if (g.getSelection == null) {
  $.getScript('http://assets.annotateit.org/vendor/ierange.min.js');
}

if (g.JSON == null) {
  $.getScript('http://assets.annotateit.org/vendor/json2.min.js');
}

if (g.Node == null) {
  g.Node = {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  };
}

Annotator.$ = $;

Annotator.Delegator = Delegator;

Annotator.Range = Range;

Annotator.Util = Util;

Annotator._instances = [];

Annotator._t = _t;

Annotator.supported = function() {
  return (function() {
    return !!this.getSelection;
  })();
};

Annotator.noConflict = function() {
  Util.getGlobal().Annotator = _Annotator;
  return this;
};

$.fn.annotator = function(options) {
  var args;
  args = Array.prototype.slice.call(arguments, 1);
  return this.each(function() {
    var instance;
    instance = $.data(this, 'annotator');
    if (instance) {
      return options && instance[options].apply(instance, args);
    } else {
      instance = new Annotator(this, options);
      return $.data(this, 'annotator', instance);
    }
  });
};

this.Annotator = Annotator;

/*
//
*/

// Generated by CoffeeScript 1.6.3
var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator.Widget = (function(_super) {
  __extends(Widget, _super);

  Widget.prototype.classes = {
    hide: 'annotator-hide',
    invert: {
      x: 'annotator-invert-x',
      y: 'annotator-invert-y'
    }
  };

  function Widget(element, options) {
    Widget.__super__.constructor.apply(this, arguments);
    this.classes = $.extend({}, Annotator.Widget.prototype.classes, this.classes);
  }

  Widget.prototype.destroy = function() {
    this.removeEvents();
    return this.element.remove();
  };

  Widget.prototype.checkOrientation = function() {
    var current, offset, viewport, widget, window;
    this.resetOrientation();
    window = $(Annotator.Util.getGlobal());
    widget = this.element.children(":first");
    offset = widget.offset();
    viewport = {
      top: window.scrollTop(),
      right: window.width() + window.scrollLeft()
    };
    current = {
      top: offset.top,
      right: offset.left + widget.width()
    };
    if ((current.top - viewport.top) < 0) {
      this.invertY();
    }
    if ((current.right - viewport.right) > 0) {
      this.invertX();
    }
    return this;
  };

  Widget.prototype.resetOrientation = function() {
    this.element.removeClass(this.classes.invert.x).removeClass(this.classes.invert.y);
    return this;
  };

  Widget.prototype.invertX = function() {
    this.element.addClass(this.classes.invert.x);
    return this;
  };

  Widget.prototype.invertY = function() {
    this.element.addClass(this.classes.invert.y);
    return this;
  };

  Widget.prototype.isInvertedY = function() {
    return this.element.hasClass(this.classes.invert.y);
  };

  Widget.prototype.isInvertedX = function() {
    return this.element.hasClass(this.classes.invert.x);
  };

  return Widget;

})(Delegator);

/*
//
*/

// Generated by CoffeeScript 1.6.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator.Editor = (function(_super) {
  __extends(Editor, _super);

  Editor.prototype.events = {
    "form submit": "submit",
    ".annotator-save click": "submit",
    ".annotator-cancel click": "hide",
    ".annotator-cancel mouseover": "onCancelButtonMouseover",
    "textarea keydown": "processKeypress"
  };

  Editor.prototype.classes = {
    hide: 'annotator-hide',
    focus: 'annotator-focus'
  };

  Editor.prototype.html = "<div class=\"annotator-outer annotator-editor\">\n  <form class=\"annotator-widget\">\n    <ul class=\"annotator-listing\"></ul>\n    <div class=\"annotator-controls\">\n      <a href=\"#cancel\" class=\"annotator-cancel\">" + _t('Cancel') + "</a>\n<a href=\"#save\" class=\"annotator-save annotator-focus\">" + _t('Save') + "</a>\n    </div>\n  </form>\n</div>";

  Editor.prototype.options = {};

  function Editor(options) {
    this.onCancelButtonMouseover = __bind(this.onCancelButtonMouseover, this);
    this.processKeypress = __bind(this.processKeypress, this);
    this.submit = __bind(this.submit, this);
    this.load = __bind(this.load, this);
    this.hide = __bind(this.hide, this);
    this.show = __bind(this.show, this);
    Editor.__super__.constructor.call(this, $(this.html)[0], options);
    this.fields = [];
    this.annotation = {};
  }

  Editor.prototype.show = function(event) {
    Annotator.Util.preventEventDefault(event);
    this.element.removeClass(this.classes.hide);
    this.element.find('.annotator-save').addClass(this.classes.focus);
    this.checkOrientation();
    this.element.find(":input:first").focus();
    this.setupDraggables();
    return this.publish('show');
  };

  Editor.prototype.isShown = function() {
    return !this.element.hasClass(this.classes.hide);
  };

  Editor.prototype.hide = function(event) {
    Annotator.Util.preventEventDefault(event);
    this.element.addClass(this.classes.hide);
    return this.publish('hide');
  };

  Editor.prototype.load = function(annotation) {
    var field, _i, _len, _ref;
    this.annotation = annotation;
    this.publish('load', [this.annotation]);
    _ref = this.fields;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      field = _ref[_i];
      field.load(field.element, this.annotation);
    }
    return this.show();
  };

  Editor.prototype.submit = function(event) {
    var field, _i, _len, _ref;
    Annotator.Util.preventEventDefault(event);
    _ref = this.fields;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      field = _ref[_i];
      field.submit(field.element, this.annotation);
    }
    this.publish('save', [this.annotation]);
    return this.hide();
  };

  Editor.prototype.addField = function(options) {
    var element, field, input;
    field = $.extend({
      id: 'annotator-field-' + Annotator.Util.uuid(),
      type: 'input',
      label: '',
      load: function() {},
      submit: function() {}
    }, options);
    input = null;
    element = $('<li class="annotator-item" />');
    field.element = element[0];
    switch (field.type) {
      case 'textarea':
        input = $('<textarea />');
        break;
      case 'input':
      case 'checkbox':
        input = $('<input />');
        break;
      case 'select':
        input = $('<select />');
    }
    element.append(input);
    input.attr({
      id: field.id,
      placeholder: field.label
    });
    if (field.type === 'checkbox') {
      input[0].type = 'checkbox';
      element.addClass('annotator-checkbox');
      element.append($('<label />', {
        "for": field.id,
        html: field.label
      }));
    }
    this.element.find('ul:first').append(element);
    this.fields.push(field);
    return field.element;
  };

  Editor.prototype.checkOrientation = function() {
    var controls, list;
    Editor.__super__.checkOrientation.apply(this, arguments);
    list = this.element.find('ul');
    controls = this.element.find('.annotator-controls');
    if (this.element.hasClass(this.classes.invert.y)) {
      controls.insertBefore(list);
    } else if (controls.is(':first-child')) {
      controls.insertAfter(list);
    }
    return this;
  };

  Editor.prototype.processKeypress = function(event) {
    if (event.keyCode === 27) {
      return this.hide();
    } else if (event.keyCode === 13 && !event.shiftKey) {
      return this.submit();
    }
  };

  Editor.prototype.onCancelButtonMouseover = function() {
    return this.element.find('.' + this.classes.focus).removeClass(this.classes.focus);
  };

  Editor.prototype.setupDraggables = function() {
    var classes, controls, cornerItem, editor, mousedown, onMousedown, onMousemove, onMouseup, resize, textarea, throttle,
      _this = this;
    this.element.find('.annotator-resize').remove();
    if (this.element.hasClass(this.classes.invert.y)) {
      cornerItem = this.element.find('.annotator-item:last');
    } else {
      cornerItem = this.element.find('.annotator-item:first');
    }
    if (cornerItem) {
      $('<span class="annotator-resize"></span>').appendTo(cornerItem);
    }
    mousedown = null;
    classes = this.classes;
    editor = this.element;
    textarea = null;
    resize = editor.find('.annotator-resize');
    controls = editor.find('.annotator-controls');
    throttle = false;
    onMousedown = function(event) {
      if (event.target === this) {
        mousedown = {
          element: this,
          top: event.pageY,
          left: event.pageX
        };
        textarea = editor.find('textarea:first');
        $(window).bind({
          'mouseup.annotator-editor-resize': onMouseup,
          'mousemove.annotator-editor-resize': onMousemove
        });
        return event.preventDefault();
      }
    };
    onMouseup = function() {
      mousedown = null;
      return $(window).unbind('.annotator-editor-resize');
    };
    onMousemove = function(event) {
      var diff, directionX, directionY, height, width;
      if (mousedown && throttle === false) {
        diff = {
          top: event.pageY - mousedown.top,
          left: event.pageX - mousedown.left
        };
        if (mousedown.element === resize[0]) {
          height = textarea.outerHeight();
          width = textarea.outerWidth();
          directionX = editor.hasClass(classes.invert.x) ? -1 : 1;
          directionY = editor.hasClass(classes.invert.y) ? 1 : -1;
          textarea.height(height + (diff.top * directionY));
          textarea.width(width + (diff.left * directionX));
          if (textarea.outerHeight() !== height) {
            mousedown.top = event.pageY;
          }
          if (textarea.outerWidth() !== width) {
            mousedown.left = event.pageX;
          }
        } else if (mousedown.element === controls[0]) {
          editor.css({
            top: parseInt(editor.css('top'), 10) + diff.top,
            left: parseInt(editor.css('left'), 10) + diff.left
          });
          mousedown.top = event.pageY;
          mousedown.left = event.pageX;
        }
        throttle = true;
        return setTimeout(function() {
          return throttle = false;
        }, 1000 / 60);
      }
    };
    resize.unbind('mousedown');
    controls.unbind('mousedown');
    resize.bind('mousedown', onMousedown);
    return controls.bind('mousedown', onMousedown);
  };

  return Editor;

})(Annotator.Widget);

/*
//
*/

// Generated by CoffeeScript 1.6.3
var LinkParser,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator.Viewer = (function(_super) {
  __extends(Viewer, _super);

  Viewer.prototype.events = {
    ".annotator-edit click": "onEditClick",
    ".annotator-delete click": "onDeleteClick"
  };

  Viewer.prototype.classes = {
    hide: 'annotator-hide',
    showControls: 'annotator-visible'
  };

  Viewer.prototype.html = {
    element: "<div class=\"annotator-outer annotator-viewer\">\n  <ul class=\"annotator-widget annotator-listing\"></ul>\n</div>",
    item: "<li class=\"annotator-annotation annotator-item\">\n  <span class=\"annotator-controls\">\n    <a href=\"#\" title=\"View as webpage\" class=\"annotator-link\">View as webpage</a>\n      <button class=\"annotator-edit\" title=\"Edit\">\n        <span class=\"eea-icon eea-icon-edit\"></span>\n      </button>\n      <button class=\"annotator-delete\" title=\"Close\">\n        <span class=\"eea-icon eea-icon-square-o\"></span>\n      </button>\n  </span>\n</li>"
  };

  Viewer.prototype.options = {
    readOnly: false
  };

  function Viewer(options) {
    this.onDeleteClick = __bind(this.onDeleteClick, this);
    this.onEditClick = __bind(this.onEditClick, this);
    this.load = __bind(this.load, this);
    this.hide = __bind(this.hide, this);
    this.show = __bind(this.show, this);
    Viewer.__super__.constructor.call(this, $(this.html.element)[0], options);
    this.item = $(this.html.item)[0];
    this.fields = [];
    this.annotations = [];
  }

  Viewer.prototype.show = function(event) {
    var controls,
      _this = this;
    Annotator.Util.preventEventDefault(event);
    if (this.annotations.length) {
      controls = this.element.find('.annotator-controls').addClass(this.classes.showControls);
      setTimeout((function() {
        return controls.removeClass(_this.classes.showControls);
      }), 500);
      this.element.removeClass(this.classes.hide);
      return this.checkOrientation().publish('show');
    }
  };

  Viewer.prototype.isShown = function() {
    return !this.element.hasClass(this.classes.hide);
  };

  Viewer.prototype.hide = function(event) {
    $('.annotator-hl').removeClass('hover');
    Annotator.Util.preventEventDefault(event);
    this.element.addClass(this.classes.hide);
    return this.publish('hide');
  };

  Viewer.prototype.load = function(annotations) {
    var annotation, controller, controls, del, edit, element, field, item, link, links, list, _i, _j, _len, _len1, _ref, _ref1;
    this.annotations = annotations || [];
    list = this.element.find('ul:first').empty();
    _ref = this.annotations;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      annotation = _ref[_i];
      item = $(this.item).clone().appendTo(list).data('annotation', annotation);
      controls = item.find('.annotator-controls');
      link = controls.find('.annotator-link');
      edit = controls.find('.annotator-edit');
      del = controls.find('.annotator-delete');
      links = new LinkParser(annotation.links || []).get('alternate', {
        'type': 'text/html'
      });
      if (links.length === 0 || (links[0].href == null)) {
        link.remove();
      } else {
        link.attr('href', links[0].href);
      }
      if (this.options.readOnly) {
        edit.remove();
        del.remove();
      } else {
        controller = {
          showEdit: function() {
            return edit.removeAttr('disabled');
          },
          hideEdit: function() {
            return edit.attr('disabled', 'disabled');
          },
          showDelete: function() {
            return del.removeAttr('disabled');
          },
          hideDelete: function() {
            return del.attr('disabled', 'disabled');
          }
        };
      }
      _ref1 = this.fields;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        field = _ref1[_j];
        element = $(field.element).clone().appendTo(item)[0];
        field.load(element, annotation, controller);
      }
    }
    this.publish('load', [this.annotations]);
    return this.show();
  };

  Viewer.prototype.addField = function(options) {
    var field;
    field = $.extend({
      load: function() {}
    }, options);
    field.element = $('<div />')[0];
    this.fields.push(field);
    field.element;
    return this;
  };

  Viewer.prototype.onEditClick = function(event) {
    return this.onButtonClick(event, 'edit');
  };

  Viewer.prototype.onDeleteClick = function(event) {
    return this.onButtonClick(event, 'delete');
  };

  Viewer.prototype.onButtonClick = function(event, type) {
    var item;
    item = $(event.target).parents('.annotator-annotation');
    return this.publish(type, [item.data('annotation')]);
  };

  return Viewer;

})(Annotator.Widget);

LinkParser = (function() {
  function LinkParser(data) {
    this.data = data;
  }

  LinkParser.prototype.get = function(rel, cond) {
    var d, k, keys, match, v, _i, _len, _ref, _results;
    if (cond == null) {
      cond = {};
    }
    cond = $.extend({}, cond, {
      rel: rel
    });
    keys = (function() {
      var _results;
      _results = [];
      for (k in cond) {
        if (!__hasProp.call(cond, k)) continue;
        v = cond[k];
        _results.push(k);
      }
      return _results;
    })();
    _ref = this.data;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      d = _ref[_i];
      match = keys.reduce((function(m, k) {
        return m && (d[k] === cond[k]);
      }), true);
      if (match) {
        _results.push(d);
      } else {
        continue;
      }
    }
    return _results;
  };

  return LinkParser;

})();

/*
//
*/

// Generated by CoffeeScript 1.6.3
var Annotator,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator = Annotator || {};

Annotator.Notification = (function(_super) {
  __extends(Notification, _super);

  Notification.prototype.events = {
    "click": "hide"
  };

  Notification.prototype.options = {
    html: "<div class='annotator-notice'></div>",
    classes: {
      show: "annotator-notice-show",
      info: "annotator-notice-info",
      success: "annotator-notice-success",
      error: "annotator-notice-error"
    }
  };

  function Notification(options) {
    this.hide = __bind(this.hide, this);
    this.show = __bind(this.show, this);
    Notification.__super__.constructor.call(this, $(this.options.html).appendTo(document.body)[0], options);
  }

  Notification.prototype.show = function(message, status) {
    if (status == null) {
      status = Annotator.Notification.INFO;
    }
    $(this.element).addClass(this.options.classes.show).addClass(this.options.classes[status]).html(Util.escape(message || ""));
    setTimeout(this.hide, 5000);
    return this;
  };

  Notification.prototype.hide = function() {
    $(this.element).removeClass(this.options.classes.show);
    return this;
  };

  return Notification;

})(Delegator);

Annotator.Notification.INFO = 'show';

Annotator.Notification.SUCCESS = 'success';

Annotator.Notification.ERROR = 'error';

$(function() {
  var notification;
  notification = new Annotator.Notification;
  Annotator.showNotification = notification.show;
  return Annotator.hideNotification = notification.hide;
});

/*
//
*/

// Generated by CoffeeScript 1.6.3
var _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator.Plugin.Unsupported = (function(_super) {
  __extends(Unsupported, _super);

  function Unsupported() {
    _ref = Unsupported.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  Unsupported.prototype.options = {
    message: Annotator._t("Sorry your current browser does not support the Annotator")
  };

  Unsupported.prototype.pluginInit = function() {
    var _this = this;
    if (!Annotator.supported()) {
      return $(function() {
        Annotator.showNotification(_this.options.message);
        if ((window.XMLHttpRequest === void 0) && (ActiveXObject !== void 0)) {
          return $('html').addClass('ie6');
        }
      });
    }
  };

  return Unsupported;

})(Annotator.Plugin);

/*
//
*/

// Generated by CoffeeScript 1.6.3
var base64Decode, base64UrlDecode, createDateFromISO8601, parseToken,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

createDateFromISO8601 = function(string) {
  var d, date, offset, regexp, time, _ref;
  regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" + "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\\.([0-9]+))?)?" + "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?";
  d = string.match(new RegExp(regexp));
  offset = 0;
  date = new Date(d[1], 0, 1);
  if (d[3]) {
    date.setMonth(d[3] - 1);
  }
  if (d[5]) {
    date.setDate(d[5]);
  }
  if (d[7]) {
    date.setHours(d[7]);
  }
  if (d[8]) {
    date.setMinutes(d[8]);
  }
  if (d[10]) {
    date.setSeconds(d[10]);
  }
  if (d[12]) {
    date.setMilliseconds(Number("0." + d[12]) * 1000);
  }
  if (d[14]) {
    offset = (Number(d[16]) * 60) + Number(d[17]);
    offset *= (_ref = d[15] === '-') != null ? _ref : {
      1: -1
    };
  }
  offset -= date.getTimezoneOffset();
  time = Number(date) + (offset * 60 * 1000);
  date.setTime(Number(time));
  return date;
};

base64Decode = function(data) {
  var ac, b64, bits, dec, h1, h2, h3, h4, i, o1, o2, o3, tmp_arr;
  if (typeof atob !== "undefined" && atob !== null) {
    return atob(data);
  } else {
    b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    i = 0;
    ac = 0;
    dec = "";
    tmp_arr = [];
    if (!data) {
      return data;
    }
    data += '';
    while (i < data.length) {
      h1 = b64.indexOf(data.charAt(i++));
      h2 = b64.indexOf(data.charAt(i++));
      h3 = b64.indexOf(data.charAt(i++));
      h4 = b64.indexOf(data.charAt(i++));
      bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
      o1 = bits >> 16 & 0xff;
      o2 = bits >> 8 & 0xff;
      o3 = bits & 0xff;
      if (h3 === 64) {
        tmp_arr[ac++] = String.fromCharCode(o1);
      } else if (h4 === 64) {
        tmp_arr[ac++] = String.fromCharCode(o1, o2);
      } else {
        tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
      }
    }
    return tmp_arr.join('');
  }
};

base64UrlDecode = function(data) {
  var i, m, _i, _ref;
  m = data.length % 4;
  if (m !== 0) {
    for (i = _i = 0, _ref = 4 - m; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      data += '=';
    }
  }
  data = data.replace(/-/g, '+');
  data = data.replace(/_/g, '/');
  return base64Decode(data);
};

parseToken = function(token) {
  var head, payload, sig, _ref;
  _ref = token.split('.'), head = _ref[0], payload = _ref[1], sig = _ref[2];
  return JSON.parse(base64UrlDecode(payload));
};

Annotator.Plugin.Auth = (function(_super) {
  __extends(Auth, _super);

  Auth.prototype.options = {
    token: null,
    tokenUrl: '/auth/token',
    autoFetch: true
  };

  function Auth(element, options) {
    Auth.__super__.constructor.apply(this, arguments);
    this.waitingForToken = [];
    if (this.options.token) {
      this.setToken(this.options.token);
    } else {
      this.requestToken();
    }
  }

  Auth.prototype.requestToken = function() {
    var _this = this;
    this.requestInProgress = true;
    return $.ajax({
      url: this.options.tokenUrl,
      dataType: 'text',
      xhrFields: {
        withCredentials: true
      }
    }).done(function(data, status, xhr) {
      return _this.setToken(data);
    }).fail(function(xhr, status, err) {
      var msg;
      msg = Annotator._t("Couldn't get auth token:");
      console.error("" + msg + " " + err, xhr);
      return Annotator.showNotification("" + msg + " " + xhr.responseText, Annotator.Notification.ERROR);
    }).always(function() {
      return _this.requestInProgress = false;
    });
  };

  Auth.prototype.setToken = function(token) {
    var _results,
      _this = this;
    this.token = token;
    this._unsafeToken = parseToken(token);
    if (this.haveValidToken()) {
      if (this.options.autoFetch) {
        this.refreshTimeout = setTimeout((function() {
          return _this.requestToken();
        }), (this.timeToExpiry() - 2) * 1000);
      }
      this.updateHeaders();
      _results = [];
      while (this.waitingForToken.length > 0) {
        _results.push(this.waitingForToken.pop()(this._unsafeToken));
      }
      return _results;
    } else {
      console.warn(Annotator._t("Didn't get a valid token."));
      if (this.options.autoFetch) {
        console.warn(Annotator._t("Getting a new token in 10s."));
        return setTimeout((function() {
          return _this.requestToken();
        }), 10 * 1000);
      }
    }
  };

  Auth.prototype.haveValidToken = function() {
    var allFields;
    allFields = this._unsafeToken && this._unsafeToken.issuedAt && this._unsafeToken.ttl && this._unsafeToken.consumerKey;
    if (allFields && this.timeToExpiry() > 0) {
      return true;
    } else {
      return false;
    }
  };

  Auth.prototype.timeToExpiry = function() {
    var expiry, issue, now, timeToExpiry;
    now = new Date().getTime() / 1000;
    issue = createDateFromISO8601(this._unsafeToken.issuedAt).getTime() / 1000;
    expiry = issue + this._unsafeToken.ttl;
    timeToExpiry = expiry - now;
    if (timeToExpiry > 0) {
      return timeToExpiry;
    } else {
      return 0;
    }
  };

  Auth.prototype.updateHeaders = function() {
    var current;
    current = this.element.data('annotator:headers');
    return this.element.data('annotator:headers', $.extend(current, {
      'x-annotator-auth-token': this.token
    }));
  };

  Auth.prototype.withToken = function(callback) {
    if (callback == null) {
      return;
    }
    if (this.haveValidToken()) {
      return callback(this._unsafeToken);
    } else {
      this.waitingForToken.push(callback);
      if (!this.requestInProgress) {
        return this.requestToken();
      }
    }
  };

  return Auth;

})(Annotator.Plugin);

/*
//
*/

// Generated by CoffeeScript 1.6.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Annotator.Plugin.Store = (function(_super) {
  __extends(Store, _super);

  Store.prototype.events = {
    'annotationCreated': 'annotationCreated',
    'annotationDeleted': 'annotationDeleted',
    'annotationUpdated': 'annotationUpdated'
  };

  Store.prototype.options = {
    annotationData: {},
    history: false,
    emulateHTTP: false,
    loadFromSearch: false,
    prefix: '/store',
    urls: {
      create: '/annotations',
      read: '/annotations/:id',
      update: '/annotations/:id',
      destroy: '/annotations/:id',
      search: '/search'
    }
  };

  function Store(element, options) {
    this._onError = __bind(this._onError, this);
    this._onLoadAnnotationsFromSearch = __bind(this._onLoadAnnotationsFromSearch, this);
    this._onLoadAnnotations = __bind(this._onLoadAnnotations, this);
    this._getAnnotations = __bind(this._getAnnotations, this);
    Store.__super__.constructor.apply(this, arguments);
    this.annotations = [];
  }

  Store.prototype.pluginInit = function() {
    if (!Annotator.supported()) {
      return;
    }
    if (this.annotator.plugins.Auth) {
      return this.annotator.plugins.Auth.withToken(this._getAnnotations);
    } else {
      return this._getAnnotations();
    }
  };

  Store.prototype._getAnnotations = function() {
    if (this.options.loadFromSearch) {
      return this.loadAnnotationsFromSearch(this.options.loadFromSearch);
    } else {
      return this.loadAnnotations();
    }
  };

  Store.prototype.annotationCreated = function(annotation) {
    var _this = this;
    if (__indexOf.call(this.annotations, annotation) < 0) {
      this.registerAnnotation(annotation);
      return this._apiRequest('create', annotation, function(data) {
        if (data.id == null) {
          console.warn(Annotator._t("Warning: No ID returned from server for annotation "), annotation);
        }
        _this.updateAnnotation(annotation, data);
        return _this.annotator.publish("afterAnnotationCreated", [annotation]);
      });
    } else {
      return this.updateAnnotation(annotation, {});
    }
  };

  Store.prototype.annotationUpdated = function(annotation) {
    var _this = this;
    if (__indexOf.call(this.annotations, annotation) >= 0) {
      return this._apiRequest('update', annotation, (function(data) {
        _this.updateAnnotation(annotation, data);
        return _this.annotator.publish("afterAnnotationUpdated", [annotation]);
      }));
    }
  };

  Store.prototype.annotationDeleted = function(annotation) {
    var _this = this;
    if (this.options.history) {
      if (annotation.deleted) {
        annotation.deleted = false;
      } else {
        annotation.deleted = true;
      }
    }
    return this._apiRequest('destroy', annotation, (function(data) {
      if (data) {
        _this.updateAnnotation(annotation, data);
      }
      if (!_this.options.history) {
        _this.unregisterAnnotation(annotation);
      }
      return _this.annotator.publish("afterAnnotationDeleted", [annotation]);
    }));
  };

  Store.prototype.registerAnnotation = function(annotation) {
    return this.annotations.push(annotation);
  };

  Store.prototype.unregisterAnnotation = function(annotation) {
    return this.annotations.splice(this.annotations.indexOf(annotation), 1);
  };

  Store.prototype.updateAnnotation = function(annotation, data) {
    var found, old, _i, _len, _ref;
    found = false;
    _ref = this.annotations;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      old = _ref[_i];
      if (old.id === annotation.id) {
        $.extend(old, annotation);
        $.extend(annotation, data);
        found = true;
        break;
      }
    }
    if (!found) {
      console.error(Annotator._t("Trying to update unregistered annotation!"));
    }
    return $(annotation.highlights).data('annotation', annotation);
  };

  Store.prototype.loadAnnotations = function() {
    return this._apiRequest('read', null, this._onLoadAnnotations);
  };

  Store.prototype._onLoadAnnotations = function(data) {
    var a, annotation, annotationMap, newData, _i, _j, _len, _len1, _ref;
    if (data == null) {
      data = [];
    }
    annotationMap = {};
    _ref = this.annotations;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      a = _ref[_i];
      annotationMap[a.id] = a;
    }
    newData = [];
    for (_j = 0, _len1 = data.length; _j < _len1; _j++) {
      a = data[_j];
      if (annotationMap[a.id]) {
        annotation = annotationMap[a.id];
        this.updateAnnotation(annotation, a);
      } else {
        newData.push(a);
      }
    }
    this.annotations = this.annotations.concat(newData);
    return this.annotator.loadAnnotations(newData.slice());
  };

  Store.prototype.loadAnnotationsFromSearch = function(searchOptions) {
    return this._apiRequest('search', searchOptions, this._onLoadAnnotationsFromSearch);
  };

  Store.prototype._onLoadAnnotationsFromSearch = function(data) {
    if (data == null) {
      data = {};
    }
    return this._onLoadAnnotations(data.rows || []);
  };

  Store.prototype.dumpAnnotations = function() {
    var ann, _i, _len, _ref, _results;
    _ref = this.annotations;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      ann = _ref[_i];
      _results.push(JSON.parse(this._dataFor(ann)));
    }
    return _results;
  };

  Store.prototype._apiRequest = function(action, obj, onSuccess) {
    var id, options, request, url;
    id = obj && obj.id;
    url = this._urlFor(action, id);
    options = this._apiRequestOptions(action, obj, onSuccess);
    request = $.ajax(url, options);
    request._id = id;
    request._action = action;
    return request;
  };

  Store.prototype._apiRequestOptions = function(action, obj, onSuccess) {
    var authenticator, data, method, opts;
    method = this._methodFor(action);
    opts = {
      type: method,
      headers: this.element.data('annotator:headers'),
      dataType: "json",
      success: onSuccess || function() {},
      error: this._onError
    };
    authenticator = this.annotator.options.authenticator;
    if (authenticator) {
      opts.headers = $.extend(opts.headers, {
        'X-CSRF-TOKEN': authenticator
      });
    }
    if (this.options.emulateHTTP && (method === 'PUT' || method === 'DELETE')) {
      opts.headers = $.extend(opts.headers, {
        'X-HTTP-Method-Override': method
      });
      opts.type = 'POST';
    }
    if (action === "search") {
      opts = $.extend(opts, {
        data: obj
      });
      return opts;
    }
    data = obj && this._dataFor(obj);
    if (this.options.emulateJSON) {
      opts.data = {
        json: data
      };
      if (this.options.emulateHTTP) {
        opts.data._method = method;
      }
      return opts;
    }
    opts = $.extend(opts, {
      data: data,
      contentType: "application/json; charset=utf-8"
    });
    return opts;
  };

  Store.prototype._urlFor = function(action, id) {
    var url;
    url = this.options.prefix != null ? this.options.prefix : '';
    url += this.options.urls[action];
    url = url.replace(/\/:id/, id != null ? '/' + id : '');
    url = url.replace(/:id/, id != null ? id : '');
    return url;
  };

  Store.prototype._methodFor = function(action) {
    var table;
    table = {
      'create': 'POST',
      'read': 'GET',
      'update': 'PUT',
      'destroy': 'DELETE',
      'search': 'GET'
    };
    return table[action];
  };

  Store.prototype._dataFor = function(annotation) {
    var data, highlights;
    highlights = annotation.highlights;
    delete annotation.highlights;
    $.extend(annotation, this.options.annotationData);
    data = JSON.stringify(annotation);
    if (highlights) {
      annotation.highlights = highlights;
    }
    return data;
  };

  Store.prototype._onError = function(xhr) {
    var action, message;
    action = xhr._action;
    message = Annotator._t("Sorry we could not ") + action + Annotator._t(" this annotation");
    if (xhr._action === 'search') {
      message = Annotator._t("Sorry we could not search the store for annotations");
    } else if (xhr._action === 'read' && !xhr._id) {
      message = Annotator._t("Sorry we could not ") + action + Annotator._t(" the annotations from the store");
    }
    switch (xhr.status) {
      case 401:
        message = Annotator._t("Sorry you are not allowed to ") + action + Annotator._t(" this annotation");
        break;
      case 404:
        message = Annotator._t("Sorry we could not connect to the annotations store");
        break;
      case 500:
        message = Annotator._t("Sorry something went wrong with the annotation store");
    }
    Annotator.showNotification(message, Annotator.Notification.ERROR);
    return console.error(Annotator._t("API request failed:") + (" '" + xhr.status + "'"));
  };

  return Store;

})(Annotator.Plugin);

/*
//
*/

// Generated by CoffeeScript 1.6.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator.Plugin.Permissions = (function(_super) {
  __extends(Permissions, _super);

  Permissions.prototype.events = {
    'beforeAnnotationCreated': 'addFieldsToAnnotation',
    'replyLoaded': 'updateReplyControls'
  };

  Permissions.prototype.options = {
    showViewPermissionsCheckbox: true,
    showEditPermissionsCheckbox: true,
    userId: function(user) {
      return user;
    },
    userString: function(user) {
      return user;
    },
    userAuthorize: function(action, annotation, user) {
      var token, tokens, _i, _len;
      if (annotation.permissions) {
        tokens = annotation.permissions[action] || [];
        if (tokens.length === 0) {
          return true;
        }
        for (_i = 0, _len = tokens.length; _i < _len; _i++) {
          token = tokens[_i];
          if (this.userId(user) === token) {
            return true;
          }
        }
        return false;
      } else if (annotation.user) {
        if (user) {
          return this.userId(user) === this.userId(annotation.user);
        } else {
          return false;
        }
      }
      return true;
    },
    user: '',
    permissions: {
      'read': [],
      'update': [],
      'delete': [],
      'admin': []
    }
  };

  function Permissions(element, options) {
    this._setAuthFromToken = __bind(this._setAuthFromToken, this);
    this.updateReplyControls = __bind(this.updateReplyControls, this);
    this.updateViewer = __bind(this.updateViewer, this);
    this.updateAnnotationPermissions = __bind(this.updateAnnotationPermissions, this);
    this.updatePermissionsField = __bind(this.updatePermissionsField, this);
    this.addFieldsToAnnotation = __bind(this.addFieldsToAnnotation, this);
    Permissions.__super__.constructor.apply(this, arguments);
    if (this.options.user) {
      this.setUser(this.options.user);
      delete this.options.user;
    }
  }

  Permissions.prototype.pluginInit = function() {
    var createCallback, self,
      _this = this;
    if (!Annotator.supported()) {
      return;
    }
    self = this;
    createCallback = function(method, type) {
      return function(field, annotation) {
        return self[method].call(self, type, field, annotation);
      };
    };
    if (!this.user && this.annotator.plugins.Auth) {
      this.annotator.plugins.Auth.withToken(this._setAuthFromToken);
    }
    if (this.options.showViewPermissionsCheckbox === true) {
      this.annotator.editor.addField({
        type: 'checkbox',
        label: Annotator._t('Allow anyone to <strong>view</strong> this annotation'),
        load: createCallback('updatePermissionsField', 'read'),
        submit: createCallback('updateAnnotationPermissions', 'read')
      });
    }
    if (this.options.showEditPermissionsCheckbox === true) {
      this.annotator.editor.addField({
        type: 'checkbox',
        label: Annotator._t('Allow anyone to <strong>edit</strong> this annotation'),
        load: createCallback('updatePermissionsField', 'update'),
        submit: createCallback('updateAnnotationPermissions', 'update')
      });
    }
    this.annotator.viewer.addField({
      load: this.updateViewer
    });
    if (this.annotator.plugins.Filter) {
      return this.annotator.plugins.Filter.addFilter({
        label: Annotator._t('User'),
        property: 'user',
        isFiltered: function(input, user) {
          var keyword, _i, _len, _ref;
          user = _this.options.userString(user);
          if (!(input && user)) {
            return false;
          }
          _ref = input.split(/\s*/);
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            keyword = _ref[_i];
            if (user.indexOf(keyword) === -1) {
              return false;
            }
          }
          return true;
        }
      });
    }
  };

  Permissions.prototype.setUser = function(user) {
    return this.user = user;
  };

  Permissions.prototype.addFieldsToAnnotation = function(annotation) {
    if (annotation) {
      annotation.permissions = this.options.permissions;
      if (this.user) {
        return annotation.user = this.user;
      }
    }
  };

  Permissions.prototype.authorize = function(action, annotation, user) {
    if (user === void 0) {
      user = this.user;
    }
    if (this.options.userAuthorize) {
      return this.options.userAuthorize.call(this.options, action, annotation, user);
    } else {
      return true;
    }
  };

  Permissions.prototype.updatePermissionsField = function(action, field, annotation) {
    var input;
    field = $(field).show();
    input = field.find('input').removeAttr('disabled');
    if (!this.authorize('admin', annotation)) {
      field.hide();
    }
    if (this.authorize(action, annotation || {}, null)) {
      return input.attr('checked', 'checked');
    } else {
      return input.removeAttr('checked');
    }
  };

  Permissions.prototype.updateAnnotationPermissions = function(type, field, annotation) {
    var dataKey;
    if (!annotation.permissions) {
      annotation.permissions = this.options.permissions;
    }
    dataKey = type + '-permissions';
    if ($(field).find('input').is(':checked')) {
      return annotation.permissions[type] = [];
    } else {
      return annotation.permissions[type] = [this.options.userId(this.user)];
    }
  };

  Permissions.prototype.updateViewer = function(field, annotation, controls) {
    var user, username, usertitle;
    field = $(field);
    username = this.options.userString(annotation.user);
    usertitle = Util.userTitle(annotation.user);
    if (annotation.user && username && typeof username === 'string') {
      user = Annotator.Util.escape(this.options.userString(annotation.user));
      field.html(user).addClass('annotator-user').attr('title', usertitle);
    } else {
      field.remove();
    }
    if (controls) {
      if (!this.authorize('update', annotation)) {
        controls.hideEdit();
      }
      if (!this.authorize('delete', annotation)) {
        return controls.hideDelete();
      }
    }
  };

  Permissions.prototype.updateReplyControls = function(data) {
    var controls, replydiv, user;
    user = data.user;
    replydiv = this.element.find('.reply');
    controls = replydiv.find('.annotator-delete-reply');
    if (controls) {
      if (this.options.userString(this.user) !== this.options.userString(user)) {
        return controls.attr('disabled', 'disabled');
      }
    }
  };

  Permissions.prototype._setAuthFromToken = function(token) {
    return this.setUser(token.userId);
  };

  return Permissions;

})(Annotator.Plugin);

/*
//
*/

// Generated by CoffeeScript 1.6.3
var _ref,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Annotator.Plugin.AnnotateItPermissions = (function(_super) {
  __extends(AnnotateItPermissions, _super);

  function AnnotateItPermissions() {
    this._setAuthFromToken = __bind(this._setAuthFromToken, this);
    this.updateAnnotationPermissions = __bind(this.updateAnnotationPermissions, this);
    this.updatePermissionsField = __bind(this.updatePermissionsField, this);
    this.addFieldsToAnnotation = __bind(this.addFieldsToAnnotation, this);
    _ref = AnnotateItPermissions.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  AnnotateItPermissions.prototype.options = {
    showViewPermissionsCheckbox: true,
    showEditPermissionsCheckbox: true,
    groups: {
      world: 'group:__world__',
      authenticated: 'group:__authenticated__',
      consumer: 'group:__consumer__'
    },
    userId: function(user) {
      return user.userId;
    },
    userString: function(user) {
      return user.userId;
    },
    userAuthorize: function(action, annotation, user) {
      var action_field, permissions, _ref1, _ref2, _ref3, _ref4;
      permissions = annotation.permissions || {};
      action_field = permissions[action] || [];
      if (_ref1 = this.groups.world, __indexOf.call(action_field, _ref1) >= 0) {
        return true;
      } else if ((user != null) && (user.userId != null) && (user.consumerKey != null)) {
        if (user.userId === annotation.user && user.consumerKey === annotation.consumer) {
          return true;
        } else if (_ref2 = this.groups.authenticated, __indexOf.call(action_field, _ref2) >= 0) {
          return true;
        } else if (user.consumerKey === annotation.consumer && (_ref3 = this.groups.consumer, __indexOf.call(action_field, _ref3) >= 0)) {
          return true;
        } else if (user.consumerKey === annotation.consumer && (_ref4 = user.userId, __indexOf.call(action_field, _ref4) >= 0)) {
          return true;
        } else if (user.consumerKey === annotation.consumer && user.admin) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    },
    permissions: {
      'read': ['group:__world__'],
      'update': [],
      'delete': [],
      'admin': []
    }
  };

  AnnotateItPermissions.prototype.addFieldsToAnnotation = function(annotation) {
    if (annotation) {
      annotation.permissions = this.options.permissions;
      if (this.user) {
        annotation.user = this.user.userId;
        return annotation.consumer = this.user.consumerKey;
      }
    }
  };

  AnnotateItPermissions.prototype.updatePermissionsField = function(action, field, annotation) {
    var input;
    field = $(field).show();
    input = field.find('input').removeAttr('disabled');
    if (!this.authorize('admin', annotation)) {
      field.hide();
    }
    if (this.user && this.authorize(action, annotation || {}, {
      userId: '__nonexistentuser__',
      consumerKey: this.user.consumerKey
    })) {
      return input.attr('checked', 'checked');
    } else {
      return input.removeAttr('checked');
    }
  };

  AnnotateItPermissions.prototype.updateAnnotationPermissions = function(type, field, annotation) {
    var dataKey;
    if (!annotation.permissions) {
      annotation.permissions = this.options.permissions;
    }
    dataKey = type + '-permissions';
    if ($(field).find('input').is(':checked')) {
      return annotation.permissions[type] = [type === 'read' ? this.options.groups.world : this.options.groups.consumer];
    } else {
      return annotation.permissions[type] = [];
    }
  };

  AnnotateItPermissions.prototype._setAuthFromToken = function(token) {
    return this.setUser(token);
  };

  return AnnotateItPermissions;

})(Annotator.Plugin.Permissions);

/*
//
*/

// Generated by CoffeeScript 1.6.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator.Plugin.Filter = (function(_super) {
  __extends(Filter, _super);

  Filter.prototype.events = {
    ".annotator-filter-property input focus": "_onFilterFocus",
    ".annotator-filter-property input blur": "_onFilterBlur",
    ".annotator-filter-property input keyup": "_onFilterKeyup",
    ".annotator-filter-previous click": "_onPreviousClick",
    ".annotator-filter-next click": "_onNextClick",
    ".annotator-filter-clear click": "_onClearClick"
  };

  Filter.prototype.classes = {
    active: 'annotator-filter-active',
    hl: {
      hide: 'annotator-hl-filtered',
      active: 'annotator-hl-active'
    }
  };

  Filter.prototype.html = {
    element: "<div class=\"annotator-filter\">\n  <strong>" + Annotator._t('Navigate:') + "</strong>\n<span class=\"annotator-filter-navigation\">\n  <button class=\"annotator-filter-previous\">" + Annotator._t('Previous') + "</button>\n<button class=\"annotator-filter-next\">" + Annotator._t('Next') + "</button>\n</span>\n<strong>" + Annotator._t('Filter by:') + "</strong>\n</div>",
    filter: "<span class=\"annotator-filter-property\">\n  <label></label>\n  <input/>\n  <button class=\"annotator-filter-clear\">" + Annotator._t('Clear') + "</button>\n</span>"
  };

  Filter.prototype.options = {
    appendTo: 'body',
    filters: [],
    addAnnotationFilter: true,
    isFiltered: function(input, property) {
      var keyword, _i, _len, _ref;
      if (!(input && property)) {
        return false;
      }
      _ref = input.split(/\s+/);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        keyword = _ref[_i];
        if (property.indexOf(keyword) === -1) {
          return false;
        }
      }
      return true;
    }
  };

  function Filter(element, options) {
    this._onPreviousClick = __bind(this._onPreviousClick, this);
    this._onNextClick = __bind(this._onNextClick, this);
    this._onFilterKeyup = __bind(this._onFilterKeyup, this);
    this._onFilterBlur = __bind(this._onFilterBlur, this);
    this._onFilterFocus = __bind(this._onFilterFocus, this);
    this.updateHighlights = __bind(this.updateHighlights, this);
    var _base;
    element = $(this.html.element).appendTo((options != null ? options.appendTo : void 0) || this.options.appendTo);
    Filter.__super__.constructor.call(this, element, options);
    (_base = this.options).filters || (_base.filters = []);
    this.filter = $(this.html.filter);
    this.filters = [];
    this.current = 0;
  }

  Filter.prototype.pluginInit = function() {
    var filter, _i, _len, _ref;
    _ref = this.options.filters;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      filter = _ref[_i];
      this.addFilter(filter);
    }
    this.updateHighlights();
    this._setupListeners()._insertSpacer();
    if (this.options.addAnnotationFilter === true) {
      return this.addFilter({
        label: Annotator._t('Annotation'),
        property: 'text'
      });
    }
  };

  Filter.prototype.destroy = function() {
    var currentMargin, html;
    Filter.__super__.destroy.apply(this, arguments);
    html = $('html');
    currentMargin = parseInt(html.css('padding-top'), 10) || 0;
    html.css('padding-top', currentMargin - this.element.outerHeight());
    return this.element.remove();
  };

  Filter.prototype._insertSpacer = function() {
    var currentMargin, html;
    html = $('html');
    currentMargin = parseInt(html.css('padding-top'), 10) || 0;
    html.css('padding-top', currentMargin + this.element.outerHeight());
    return this;
  };

  Filter.prototype._setupListeners = function() {
    var event, events, _i, _len;
    events = ['annotationsLoaded', 'annotationCreated', 'annotationUpdated', 'annotationDeleted'];
    for (_i = 0, _len = events.length; _i < _len; _i++) {
      event = events[_i];
      this.annotator.subscribe(event, this.updateHighlights);
    }
    return this;
  };

  Filter.prototype.addFilter = function(options) {
    var f, filter;
    filter = $.extend({
      label: '',
      property: '',
      isFiltered: this.options.isFiltered
    }, options);
    if (!((function() {
      var _i, _len, _ref, _results;
      _ref = this.filters;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        f = _ref[_i];
        if (f.property === filter.property) {
          _results.push(f);
        }
      }
      return _results;
    }).call(this)).length) {
      filter.id = 'annotator-filter-' + filter.property;
      filter.annotations = [];
      filter.element = this.filter.clone().appendTo(this.element);
      filter.element.find('label').html(filter.label).attr('for', filter.id);
      filter.element.find('input').attr({
        id: filter.id,
        placeholder: Annotator._t('Filter by ') + filter.label + '\u2026'
      });
      filter.element.find('button').hide();
      filter.element.data('filter', filter);
      this.filters.push(filter);
    }
    return this;
  };

  Filter.prototype.updateFilter = function(filter) {
    var annotation, annotations, input, property, _i, _len, _ref;
    filter.annotations = [];
    this.updateHighlights();
    this.resetHighlights();
    input = $.trim(filter.element.find('input').val());
    if (input) {
      annotations = this.highlights.map(function() {
        return $(this).data('annotation');
      });
      _ref = $.makeArray(annotations);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        annotation = _ref[_i];
        property = annotation[filter.property];
        if (filter.isFiltered(input, property)) {
          filter.annotations.push(annotation);
        }
      }
      return this.filterHighlights();
    }
  };

  Filter.prototype.updateHighlights = function() {
    this.highlights = this.annotator.element.find('.annotator-hl:visible');
    return this.filtered = this.highlights.not(this.classes.hl.hide);
  };

  Filter.prototype.filterHighlights = function() {
    var activeFilters, annotation, annotations, filtered, highlights, index, uniques, _i, _len, _ref;
    activeFilters = $.grep(this.filters, function(filter) {
      return !!filter.annotations.length;
    });
    filtered = ((_ref = activeFilters[0]) != null ? _ref.annotations : void 0) || [];
    if (activeFilters.length > 1) {
      annotations = [];
      $.each(activeFilters, function() {
        return $.merge(annotations, this.annotations);
      });
      uniques = [];
      filtered = [];
      $.each(annotations, function() {
        if ($.inArray(this, uniques) === -1) {
          return uniques.push(this);
        } else {
          return filtered.push(this);
        }
      });
    }
    highlights = this.highlights;
    for (index = _i = 0, _len = filtered.length; _i < _len; index = ++_i) {
      annotation = filtered[index];
      highlights = highlights.not(annotation.highlights);
    }
    highlights.addClass(this.classes.hl.hide);
    this.filtered = this.highlights.not(this.classes.hl.hide);
    return this;
  };

  Filter.prototype.resetHighlights = function() {
    this.highlights.removeClass(this.classes.hl.hide);
    this.filtered = this.highlights;
    return this;
  };

  Filter.prototype._onFilterFocus = function(event) {
    var input;
    input = $(event.target);
    input.parent().addClass(this.classes.active);
    return input.next('button').show();
  };

  Filter.prototype._onFilterBlur = function(event) {
    var input;
    if (!event.target.value) {
      input = $(event.target);
      input.parent().removeClass(this.classes.active);
      return input.next('button').hide();
    }
  };

  Filter.prototype._onFilterKeyup = function(event) {
    var filter;
    filter = $(event.target).parent().data('filter');
    if (filter) {
      return this.updateFilter(filter);
    }
  };

  Filter.prototype._findNextHighlight = function(previous) {
    var active, annotation, current, index, next, offset, operator, resetOffset;
    if (!this.highlights.length) {
      return this;
    }
    offset = previous ? 0 : -1;
    resetOffset = previous ? -1 : 0;
    operator = previous ? 'lt' : 'gt';
    active = this.highlights.not('.' + this.classes.hl.hide);
    current = active.filter('.' + this.classes.hl.active);
    if (!current.length) {
      current = active.eq(offset);
    }
    annotation = current.data('annotation');
    index = active.index(current[0]);
    next = active.filter(":" + operator + "(" + index + ")").not(annotation.highlights).eq(resetOffset);
    if (!next.length) {
      next = active.eq(resetOffset);
    }
    return this._scrollToHighlight(next.data('annotation').highlights);
  };

  Filter.prototype._onNextClick = function(event) {
    return this._findNextHighlight();
  };

  Filter.prototype._onPreviousClick = function(event) {
    return this._findNextHighlight(true);
  };

  Filter.prototype._scrollToHighlight = function(highlight) {
    highlight = $(highlight);
    this.highlights.removeClass(this.classes.hl.active);
    highlight.addClass(this.classes.hl.active);
    return $('html, body').animate({
      scrollTop: highlight.offset().top - (this.element.height() + 20)
    }, 150);
  };

  Filter.prototype._onClearClick = function(event) {
    return $(event.target).prev('input').val('').keyup().blur();
  };

  return Filter;

})(Annotator.Plugin);

/*
//
*/

// Generated by CoffeeScript 1.6.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator.Plugin.Markdown = (function(_super) {
  __extends(Markdown, _super);

  Markdown.prototype.events = {
    'annotationViewerTextField': 'updateTextField'
  };

  function Markdown(element, options) {
    this.updateTextField = __bind(this.updateTextField, this);
    if ((typeof Showdown !== "undefined" && Showdown !== null ? Showdown.converter : void 0) != null) {
      Markdown.__super__.constructor.apply(this, arguments);
      this.converter = new Showdown.converter();
    } else {
      console.error(Annotator._t("To use the Markdown plugin, you must include Showdown into the page first."));
    }
  }

  Markdown.prototype.updateTextField = function(field, annotation) {
    var text;
    text = Annotator.Util.escape(annotation.text || '');
    return $(field).html(this.convert(text));
  };

  Markdown.prototype.convert = function(text) {
    return this.converter.makeHtml(text);
  };

  return Markdown;

})(Annotator.Plugin);

/*
//
*/

// Generated by CoffeeScript 1.6.3
var _ref,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator.Plugin.Tags = (function(_super) {
  __extends(Tags, _super);

  function Tags() {
    this.setAnnotationTags = __bind(this.setAnnotationTags, this);
    this.updateField = __bind(this.updateField, this);
    _ref = Tags.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  Tags.prototype.options = {
    parseTags: function(string) {
      var tags;
      string = $.trim(string);
      tags = [];
      if (string) {
        tags = string.split(/\s+/);
      }
      return tags;
    },
    stringifyTags: function(array) {
      return array.join(" ");
    }
  };

  Tags.prototype.field = null;

  Tags.prototype.input = null;

  Tags.prototype.pluginInit = function() {
    if (!Annotator.supported()) {
      return;
    }
    this.field = this.annotator.editor.addField({
      label: Annotator._t('Add some tags here') + '\u2026',
      load: this.updateField,
      submit: this.setAnnotationTags
    });
    this.annotator.viewer.addField({
      load: this.updateViewer
    });
    if (this.annotator.plugins.Filter) {
      this.annotator.plugins.Filter.addFilter({
        label: Annotator._t('Tag'),
        property: 'tags',
        isFiltered: Annotator.Plugin.Tags.filterCallback
      });
    }
    return this.input = $(this.field).find(':input');
  };

  Tags.prototype.parseTags = function(string) {
    return this.options.parseTags(string);
  };

  Tags.prototype.stringifyTags = function(array) {
    return this.options.stringifyTags(array);
  };

  Tags.prototype.updateField = function(field, annotation) {
    var value;
    value = '';
    if (annotation.tags) {
      value = this.stringifyTags(annotation.tags);
    }
    return this.input.val(value);
  };

  Tags.prototype.setAnnotationTags = function(field, annotation) {
    return annotation.tags = this.parseTags(this.input.val());
  };

  Tags.prototype.updateViewer = function(field, annotation) {
    field = $(field);
    if (annotation.tags && $.isArray(annotation.tags) && annotation.tags.length) {
      return field.addClass('annotator-tags').html(function() {
        var string;
        return string = $.map(annotation.tags, function(tag) {
          return '<span class="annotator-tag">' + Annotator.Util.escape(tag) + '</span>';
        }).join(' ');
      });
    } else {
      return field.remove();
    }
  };

  return Tags;

})(Annotator.Plugin);

Annotator.Plugin.Tags.filterCallback = function(input, tags) {
  var keyword, keywords, matches, tag, _i, _j, _len, _len1;
  if (tags == null) {
    tags = [];
  }
  matches = 0;
  keywords = [];
  if (input) {
    keywords = input.split(/\s+/g);
    for (_i = 0, _len = keywords.length; _i < _len; _i++) {
      keyword = keywords[_i];
      if (tags.length) {
        for (_j = 0, _len1 = tags.length; _j < _len1; _j++) {
          tag = tags[_j];
          if (tag.indexOf(keyword) !== -1) {
            matches += 1;
          }
        }
      }
    }
  }
  return matches === keywords.length;
};

/*
//
*/

// Generated by CoffeeScript 1.6.3
var __hasProp = {}.hasOwnProperty,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Annotator.prototype.setupPlugins = function(config, options) {
  var name, opts, pluginConfig, plugins, uri, win, _i, _len, _results;
  if (config == null) {
    config = {};
  }
  if (options == null) {
    options = {};
  }
  win = Annotator.Util.getGlobal();
  plugins = ['Unsupported', 'Auth', 'Tags', 'Filter', 'Store', 'AnnotateItPermissions'];
  if (win.Showdown) {
    plugins.push('Markdown');
  }
  uri = win.location.href.split(/#|\?/).shift() || '';
  pluginConfig = {
    Tags: {},
    Filter: {
      filters: [
        {
          label: Annotator._t('User'),
          property: 'user'
        }, {
          label: Annotator._t('Tags'),
          property: 'tags'
        }
      ]
    },
    Auth: {
      tokenUrl: config.tokenUrl || 'http://annotateit.org/api/token'
    },
    Store: {
      prefix: config.storeUrl || 'http://annotateit.org/api',
      annotationData: {
        uri: uri
      },
      loadFromSearch: {
        uri: uri
      }
    }
  };
  for (name in options) {
    if (!__hasProp.call(options, name)) continue;
    opts = options[name];
    if (__indexOf.call(plugins, name) < 0) {
      plugins.push(name);
    }
  }
  $.extend(true, pluginConfig, options);
  _results = [];
  for (_i = 0, _len = plugins.length; _i < _len; _i++) {
    name = plugins[_i];
    if (!(name in pluginConfig) || pluginConfig[name]) {
      _results.push(this.addPlugin(name, pluginConfig[name]));
    } else {
      _results.push(void 0);
    }
  }
  return _results;
};

/*
//
*/

// Generated by CoffeeScript 1.6.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator.Plugin.Comment = (function(_super) {
  __extends(Comment, _super);

  Comment.prototype.events = {
    'annotationViewerShown': 'addReplyButton',
    '.annotator-reply-save click': 'onReplyEntryClick',
    '.annotator-cancel click': 'hide',
    '.replyentry keydown': 'processKeypress',
    '.replyentry click': 'processKeypress',
    '.annotator-delete-reply click': 'deleteReply'
  };

  function Comment(element) {
    this.processKeypress = __bind(this.processKeypress, this);
    Comment.__super__.constructor.apply(this, arguments);
  }

  Comment.prototype.pluginInit = function() {
    if (!Annotator.supported()) {

    }
  };

  Comment.prototype.addReplyButton = function(viewer, annotations) {
    var control, data, dateString, div, idx, isoDate, item, listing, published, replies, reply, replylist, username, usertitle, _i, _j, _len, _len1;
    listing = this.annotator.element.find('.annotator-annotation.annotator-item');
    for (idx = _i = 0, _len = listing.length; _i < _len; idx = ++_i) {
      item = listing[idx];
      item = $(item);
      replies = annotations[idx].replies || [];
      if (replies.length > 0) {
        item.append('<div class="annotator-replies"></div>');
      }
      if (replies.length > 0) {
        replylist = this.annotator.element.find('.annotator-replies');
        for (_j = 0, _len1 = replies.length; _j < _len1; _j++) {
          reply = replies[_j];
          usertitle = Util.userTitle(reply.user);
          username = Util.userString(reply.user);
          isoDate = reply.updated || reply.created;
          if (!isoDate.endsWith('Z')) {
            isoDate += 'Z';
          }
          published = new Date(isoDate);
          dateString = Util.easyDate(published);
          div = '<div class=\'reply\'>';
          if (!this.annotator.options.readOnly) {
            if (reply === replies[replies.length - 1]) {
              control = '<span class=\'annotator-controls\'>';
              control += '<button title="Delete" class=\'annotator-delete-reply\'>';
              control += '<span class=\'eea-icon eea-icon-times\'></span>';
              control += '</button>';
              control += '</span>';
              div += control;
            }
          }
          div += '<div class=\'replytext\'>' + reply.reply + '</div>\n<div class=\'annotator-date\' title="' + Util.prettyDateString(published) + '">' + dateString + '</div>\n<div class=\'annotator-user replyuser\' title="' + usertitle + '">' + username + '</div>\n</div>';
          $(replylist[idx]).append(div);
          data = {
            user: reply.user,
            replydiv: div,
            replies_no: replies.length
          };
          this.publish('replyLoaded', data);
        }
      }
      if (!this.annotator.options.readOnly) {
        item.append('<div class=\'replybox\'><textarea class="replyentry" placeholder="Reply..."></textarea>');
      }
    }
    return viewer.checkOrientation();
  };

  Comment.prototype.onReplyEntryClick = function(event) {
    var item, new_annotation, reply, replyObject, textarea;
    event.preventDefault();
    item = $(event.target).parent().parent();
    textarea = item.find('.replyentry');
    reply = textarea.val();
    if (reply !== '') {
      replyObject = this.getReplyObject();
      replyObject.reply = reply;
      item = $(event.target).parents('.annotator-annotation');
      new_annotation = item.data('annotation');
      if (!new_annotation.replies) {
        new_annotation.replies = [];
      }
      new_annotation.replies.push(replyObject);
      new_annotation = this.annotator.updateAnnotation(new_annotation);
      return this.annotator.viewer.hide();
    }
  };

  Comment.prototype.deleteReply = function(event) {
    var annotation, idx, item, replies, reply, text, _i, _len;
    item = $(event.target).parents('.reply');
    annotation = item.parents('.annotator-annotation').data('annotation');
    text = item.find('.replytext')[0].innerHTML;
    replies = annotation.replies || [];
    for (idx = _i = 0, _len = replies.length; _i < _len; idx = ++_i) {
      reply = replies[idx];
      if (text === reply.reply) {
        annotation.replies[idx].remove = true;
        item.slideUp(function() {
          return item.remove();
        });
      }
    }
    return annotation = this.annotator.updateAnnotation(annotation);
  };

  Comment.prototype.getReplyObject = function() {
    var replyObject;
    replyObject = {
      reply: "",
      created: new Date().toJSON()
    };
    return replyObject;
  };

  Comment.prototype.processKeypress = function(event) {
    var controls, item;
    item = $(event.target).parent();
    controls = item.find('.annotator-reply-controls');
    if (controls.length === 0) {
      item.append('<div class="annotator-reply-controls">\n<a href="#save" class="annotator-reply-save">Save</a>\n<a href="#cancel" class="annotator-cancel">Cancel</a>\n</div>\n</div>');
      this.annotator.viewer.checkOrientation();
    }
    if (event.keyCode === 27) {
      return this.annotator.viewer.hide();
    } else if (event.keyCode === 13 && !event.shiftKey) {
      return this.onReplyEntryClick(event);
    }
  };

  Comment.prototype.hide = function(event) {
    event.preventDefault();
    return this.annotator.viewer.hide();
  };

  return Comment;

})(Annotator.Plugin);

/*
//
*/

// Generated by CoffeeScript 1.6.3
var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Annotator.Plugin.Errata = (function(_super) {
  __extends(Errata, _super);

  Errata.prototype.events = {
    'afterAnnotationsLoaded': 'annotationsLoaded',
    'afterAnnotationCreated': 'annotationCreated',
    'afterAnnotationDeleted': 'annotationDeleted',
    'afterAnnotationUpdated': 'annotationUpdated',
    'rangeNormalizeFail': 'rangeNormalizeFail'
  };

  Errata.prototype.options = {
    element: '.annotator-errata'
  };

  function Errata(element, options) {
    Errata.__super__.constructor.apply(this, arguments);
  }

  Errata.prototype.pluginInit = function() {
    var erratum, item, _i, _len, _ref, _results;
    if (!Annotator.supported()) {
      return;
    }
    this.errata = [];
    this.elements = $(this.options.element);
    _ref = this.elements;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      item = _ref[_i];
      erratum = new Annotator.Erratum(item, {
        annotator: this.annotator
      });
      _results.push(this.errata.push(erratum));
    }
    return _results;
  };

  Errata.prototype.annotationsLoaded = function(annotations) {
    var erratum, _i, _len, _ref, _results;
    _ref = this.errata;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      erratum = _ref[_i];
      _results.push(erratum.annotationsLoaded(annotations));
    }
    return _results;
  };

  Errata.prototype.annotationCreated = function(annotation) {
    var erratum, _i, _len, _ref, _results;
    _ref = this.errata;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      erratum = _ref[_i];
      _results.push(erratum.annotationCreated(annotation));
    }
    return _results;
  };

  Errata.prototype.annotationDeleted = function(annotation) {
    var erratum, _i, _len, _ref, _results;
    _ref = this.errata;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      erratum = _ref[_i];
      _results.push(erratum.annotationDeleted(annotation));
    }
    return _results;
  };

  Errata.prototype.annotationUpdated = function(annotation) {
    var erratum, _i, _len, _ref, _results;
    _ref = this.errata;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      erratum = _ref[_i];
      _results.push(erratum.annotationUpdated(annotation));
    }
    return _results;
  };

  Errata.prototype.rangeNormalizeFail = function(annotation) {
    var erratum, _i, _len, _ref, _results;
    _ref = this.errata;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      erratum = _ref[_i];
      _results.push(erratum.rangeNormalizeFail(annotation));
    }
    return _results;
  };

  return Errata;

})(Annotator.Plugin);

Annotator.Erratum = (function(_super) {
  __extends(Erratum, _super);

  Erratum.prototype.options = {
    annotator: null
  };

  Erratum.prototype.missing = {};

  function Erratum(element, options) {
    this.processKeypress = __bind(this.processKeypress, this);
    Erratum.__super__.constructor.apply(this, arguments);
    this.annotator = this.options.annotator;
    this.readOnly = this.annotator.options.readOnly;
    this;
  }

  Erratum.prototype._setupSections = function() {
    this.element.empty();
    this.element.addClass('eea-accordion-panels collapsed-by-default non-exclusive');
    this.pendingCount = 0;
    this.pending = $('<div class="annotator-erratum-section annotator-erratum-pending eea-accordion-panel">\n  <h2>Active comments (<span class="count">' + this.pendingCount + '</span>)<span class="eea-icon eea-icon-right"></span></h2>\n  <div class="pane"></div>\n</div>').appendTo(this.element);
    this.closedCount = 0;
    return this.closed = $('<div class="annotator-erratum-section annotator-erratum-closed eea-accordion-panel">\n  <h2>Closed comments (<span class="count">' + this.closedCount + '</span>)<span class="eea-icon eea-icon-right"></span></h2>\n  <div class="pane"></div>\n</div>').appendTo(this.element);
  };

  Erratum.prototype._setupComment = function(annotation, onload) {
    var comment, dateString, div, erratum, icon, isoDate, missing, published, quote, replies, reply, replybox, self, textString, textarea, userString, userTitle, where, _i, _len;
    if (onload == null) {
      onload = false;
    }
    self = this;
    textString = Util.escape(annotation.text);
    userTitle = Util.userTitle(annotation.user);
    userString = Util.userString(annotation.user);
    isoDate = annotation.created;
    if (!isoDate.endsWith('Z')) {
      isoDate += 'Z';
    }
    published = new Date(isoDate);
    dateString = Util.easyDate(published);
    div = $('<div class="annotator-erratum annotator-item" data-id="' + annotation.id + '">\n<span class="annotator-controls">\n  <button title="Close" class="annotator-delete">\n    <span class="eea-icon eea-icon-square-o"></span>\n  </button>\n</span>\n<div class="erratum-quote">\n  <span class="erratum-header-date" title="' + Util.prettyDateString(published) + '">' + dateString + '</span>\n<span class="erratum-header-user" title="' + userTitle + '">' + userString + '</span>\n<span class="erratum-header-text">' + textString + '</span>\n</div>\n<dl class="erratum-comment">\n  <dt class="replyquote">' + annotation.quote + '</dt>\n  </dl>\n</div>');
    div.find('.annotator-delete').click(function(evt) {
      return self.annotator.onDeleteAnnotation(annotation);
    });
    erratum = div.find('.erratum-comment').hide();
    replies = annotation.replies || [];
    if (replies.length) {
      $('<dt class="erratum-header-replies">Replies</dt>').appendTo(erratum);
    }
    for (_i = 0, _len = replies.length; _i < _len; _i++) {
      reply = replies[_i];
      textString = Util.escape(reply.reply);
      userTitle = Util.userTitle(reply.user);
      userString = Util.userString(reply.user);
      isoDate = reply.updated || reply.created;
      if (!isoDate.endsWith('Z')) {
        isoDate += 'Z';
      }
      published = new Date(isoDate);
      dateString = Util.easyDate(published);
      comment = $('<dt class="replytext">' + textString + '</dt>\n<dd class="annotator-date" title="' + Util.prettyDateString(published) + '">' + dateString + '</dd>\n<dd class="annotator-user" title="' + userTitle + '">' + userString + '</dd>');
      comment.appendTo(erratum);
    }
    missing = this.missing[annotation.id];
    if (missing) {
      div.addClass('missing');
      quote = div.find('.erratum-comment');
      quote.attr("data-tooltip", "Can't find the text the comment was referring to");
      quote.data("tooltip", "Can't find the text the comment was referring to");
    }
    if (this.readOnly) {
      div.find('.annotator-controls').remove();
    } else if (!annotation.deleted) {
      replybox = $('<div class=\'replybox\'><textarea class="replyentry-errata" placeholder="Reply..."></textarea>');
      replybox.appendTo(erratum);
      textarea = replybox.find('.replyentry-errata');
      textarea.bind('click', function(evt) {
        return self.processKeypress(evt, annotation);
      });
      textarea.bind('keydown', function(evt) {
        return self.processKeypress(evt, annotation);
      });
    }
    icon = div.find('.eea-icon-square-o');
    if (annotation.deleted) {
      where = this.closed.find('.pane');
      icon.removeClass('eea-icon-square-o').addClass('eea-icon-check-square-o').attr('title', 'Reopen');
      icon.bind({
        "click": function() {
          icon.removeClass('eea-icon-check-square-o');
          return icon.addClass('eea-icon-square-o');
        }
      });
    } else {
      where = this.pending.find('.pane');
      icon.bind({
        "click": function() {
          icon.removeClass('eea-icon-square-o');
          return icon.addClass('eea-icon-check-square-o');
        }
      });
    }
    div.data('id', annotation.id).data('comment', annotation).hide().prependTo(where).slideDown(function() {
      self._reloadComment(annotation, onload);
      return self._updateCounters();
    });
    return this;
  };

  Erratum.prototype.processKeypress = function(event, annotation) {
    var cancel_btn, controls, item, reply_controls, save_btn, self;
    self = this;
    item = $(event.target).parent();
    controls = item.find('.annotator-reply-controls');
    if (controls.length === 0) {
      reply_controls = $('<div class="annotator-reply-controls">\n<a href="#save" class="annotator-reply-save">Save</a>\n<a href="#cancel" class="annotator-cancel">Cancel</a>\n</div>\n</div>');
      item.append(reply_controls);
      save_btn = reply_controls.find('.annotator-reply-save');
      cancel_btn = reply_controls.find('.annotator-cancel');
      if (save_btn) {
        save_btn.bind('click', function(evt) {
          evt.preventDefault();
          return self.onReplyEntryClick(evt, annotation);
        });
      }
      if (cancel_btn) {
        cancel_btn.bind('click', function(evt) {
          evt.preventDefault();
          return self.onCancelReply(evt, annotation);
        });
      }
    }
    if (event.keyCode === 13 && !event.shiftKey) {
      return this.onReplyEntryClick(event, annotation);
    } else if (event.keyCode === 27) {
      return this.onCancelReply(event, annotation);
    }
  };

  Erratum.prototype.onReplyEntryClick = function(event, annotation) {
    var item, reply, replyObject, textarea;
    event.preventDefault();
    item = $(event.target).parent().parent();
    textarea = item.find('.replyentry-errata');
    reply = textarea.val();
    if (reply !== '') {
      replyObject = this.getReplyObject();
      replyObject.reply = reply;
      if (!annotation.replies) {
        annotation.replies = [];
      }
      annotation.replies.push(replyObject);
      return annotation = this.annotator.updateAnnotation(annotation);
    }
  };

  Erratum.prototype.onCancelReply = function(event, annotation) {
    var item, reply_controls;
    event.preventDefault();
    item = $(event.target).parents('.erratum-comment');
    reply_controls = item.find('.annotator-reply-controls');
    reply_controls.parent().find('.replyentry-errata').val('');
    return reply_controls.remove();
  };

  Erratum.prototype.getReplyObject = function() {
    var replyObject;
    replyObject = {
      reply: "",
      created: new Date().toJSON()
    };
    return replyObject;
  };

  Erratum.prototype._reloadComment = function(annotation, onload) {
    var comment, erratum_quote, openedAnnotation, parent, self;
    if (onload == null) {
      onload = false;
    }
    self = this;
    comment = this.element.find('[data-id="' + annotation.id + '"]');
    parent = comment.parent();
    openedAnnotation = parent.data('openedAnnotation');
    if (openedAnnotation === annotation.id) {
      this.element.find('.erratum-comment').slideUp('fast');
      this.element.find('.annotator-erratum').removeClass('open');
      comment.addClass('open');
      comment.find('.erratum-comment').slideDown('fast');
    }
    erratum_quote = comment.find('.erratum-quote');
    erratum_quote.unbind();
    erratum_quote.bind({
      'click': function(evt) {
        var data, opened;
        data = {
          annotation: annotation,
          element: comment
        };
        self.publish('beforeClick', data);
        opened = comment.hasClass('open');
        self.element.find('.erratum-comment').slideUp('fast');
        self.element.find('.annotator-erratum').removeClass('open');
        self.element.find('.erratum-comment').trigger('commentUnCollapsed', [data]);
        if (!opened) {
          comment.addClass('open');
          comment.find('.erratum-comment').slideDown('fast');
          comment.find('.erratum-comment').trigger('commentCollapsed', [data]);
          parent.data('openedAnnotation', annotation.id);
        } else {
          parent.removeData('openedAnnotation');
        }
        return self.publish('afterClick', data);
      }
    });
    if (!onload) {
      this.annotator.publish("annotationErrataUpdated", [annotation]);
    }
    return this;
  };

  Erratum.prototype._updateCounters = function() {
    this.closedCount = this.closed.find('.annotator-erratum').length;
    this.pendingCount = this.pending.find('.annotator-erratum').length;
    this.closed.find('h2 .count').text(this.closedCount);
    return this.pending.find('h2 .count').text(this.pendingCount);
  };

  Erratum.prototype.annotationsLoaded = function(annotations) {
    var annotation, compare, _i, _len, _ref;
    if (annotations == null) {
      annotations = [];
    }
    compare = function(a, b) {
      if (a.updated < b.updated) {
        return -1;
      } else if (a.updated > b.updated) {
        return 1;
      }
      return 0;
    };
    this._setupSections();
    _ref = annotations.sort(compare);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      annotation = _ref[_i];
      this._setupComment(annotation, true);
    }
    this.publish("annotationsErrataLoaded", [annotations]);
    return this;
  };

  Erratum.prototype.annotationCreated = function(annotation) {
    this._setupComment(annotation);
    return this;
  };

  Erratum.prototype.annotationDeleted = function(annotation) {
    var closed, comment, pending, self;
    self = this;
    pending = this.pending.find('[data-id="' + annotation.id + '"]');
    if (pending.length) {
      annotation.deleted = true;
    }
    closed = this.closed.find('[data-id="' + annotation.id + '"]');
    if (closed.length) {
      annotation.deleted = false;
    }
    comment = this.element.find('[data-id="' + annotation.id + '"]');
    comment.slideUp(function() {
      comment.remove();
      self._setupComment(annotation);
      return self.annotator.setupAnnotation(annotation);
    });
    return this;
  };

  Erratum.prototype.annotationUpdated = function(annotation) {
    var comment, self;
    self = this;
    comment = this.element.find('[data-id="' + annotation.id + '"]');
    if (comment.length) {
      comment.slideUp(function() {
        return comment.remove();
      });
    }
    this._setupComment(annotation);
    return this;
  };

  Erratum.prototype.rangeNormalizeFail = function(annotation) {
    this.missing[annotation.id] = annotation.quote;
    return this;
  };

  return Erratum;

})(Delegator);

/*
//
*/

// Generated by CoffeeScript 1.6.3
var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator.Plugin.EEAGoogleChartsUnpivotAnnotation = (function(_super) {
  __extends(EEAGoogleChartsUnpivotAnnotation, _super);

  function EEAGoogleChartsUnpivotAnnotation(element, options) {
    this.element = element;
    this.options = options;
    $(window).unbind("EEAGoogleChartsUnpivotAnnotation.events.inputChanged");
    $(window).bind("EEAGoogleChartsUnpivotAnnotation.events.inputChanged", this.changeTextArea);
  }

  EEAGoogleChartsUnpivotAnnotation.prototype.pluginInit = function() {
    this.annotator.editor.addField({
      label: 'dummyField',
      type: 'input',
      load: this.overrideEditor
    });
    this.annotator.viewer.addField({
      load: this.overrideViewer
    });
  };

  EEAGoogleChartsUnpivotAnnotation.prototype.overrideEditor = function(annotation) {
    var annot, obj;
    $(this.element).parent().find("textarea").attr("placeholder", "").attr("readonly", "readonly").css("color", "transparent").addClass("hiddenAnnotatorTextArea");
    annot = $(".hiddenAnnotatorTextArea").attr("value");
    obj = jQuery(this.element).parent().find("textarea").parent();
    obj.closest(".annotator-listing").height("110px");
    $(this.element).remove();
    $(".googlechartAnnotationEditorTable").html("");
    $(".googlechartAnnotationViewerTable").remove();
    $("<table>").attr("style", "position:relative; left:10px; top:-95px;").addClass("googlechartAnnotationEditorTable").appendTo(obj);
    $("<tr>").addClass("googlechartAnnotationColumnType").appendTo(".googlechartAnnotationEditorTable");
    $("<td>").text("Column Type").appendTo(".googlechartAnnotationColumnType");
    $("<td>").html("<select>").appendTo(".googlechartAnnotationColumnType");
    $("<option>").attr("value", "base").text("base").appendTo(".googlechartAnnotationColumnType select");
    $("<option>").attr("value", "pivot").text("pivot").appendTo(".googlechartAnnotationColumnType select");
    $("<tr>").addClass("googlechartAnnotationColumnName").appendTo(".googlechartAnnotationEditorTable");
    $("<td>").text("Column Name").appendTo(".googlechartAnnotationColumnName");
    $("<td>").html("<input type='text' style='padding:3px;margin-top:0px; height:30px; margin-bottom:5px;border:1px solid #cccccc'>").appendTo(".googlechartAnnotationColumnName");
    $("<tr>").addClass("googlechartAnnotationValueType").appendTo(".googlechartAnnotationEditorTable");
    $("<td>").text("Value Type").appendTo(".googlechartAnnotationValueType");
    $("<td>").html("<select>").appendTo(".googlechartAnnotationValueType");
    $("<option>").attr("value", "string").text("string").appendTo(".googlechartAnnotationValueType select");
    $("<option>").attr("value", "number").text("number").appendTo(".googlechartAnnotationValueType select");
    $("<option>").attr("value", "date").text("date").appendTo(".googlechartAnnotationValueType select");
    $(".googlechartAnnotationEditorTable select").bind("change", function() {
      $(window).trigger("EEAGoogleChartsUnpivotAnnotation.events.inputChanged");
    });
    $(".googlechartAnnotationEditorTable input").bind("change", function() {
      $(window).trigger("EEAGoogleChartsUnpivotAnnotation.events.inputChanged");
    });
    if (annot !== "") {
      annot = JSON.parse(annot);
      $(".googlechartAnnotationColumnType select").attr("value", annot.colType);
      $(".googlechartAnnotationColumnName input").attr("value", annot.colName);
      $(".googlechartAnnotationValueType select").attr("value", annot.valType);
    }
    $(window).trigger("EEAGoogleChartsUnpivotAnnotation.events.inputChanged");
  };

  EEAGoogleChartsUnpivotAnnotation.prototype.overrideViewer = function(annotation) {
    var annot, obj;
    if ($(".googlechartAnnotationEditorTable").is(":visible")) {
      return;
    }
    obj = $(".annotator-widget.annotator-listing");
    obj.find(".eea-icon-edit").removeClass("eea-icon-edit").addClass("eea-icon-pencil");
    obj.find(".eea-icon-square-o").removeClass("eea-icon-square-o").addClass("eea-icon-trash-o");
    obj.find(".annotator-edit").height("18px");
    obj.find(".annotator-delete").height("18px");
    annot = JSON.parse(obj.find("div:first").text());
    obj.find("div").remove();
    $("<table style='margin:10px'>").addClass("googlechartAnnotationViewerTable").appendTo(obj);
    $("<tr>").addClass("googlechartAnnotationColumnType").appendTo(".googlechartAnnotationViewerTable");
    $("<td>").text("Column Type:").appendTo(".googlechartAnnotationColumnType");
    $("<td style='font-weight:bold; padding-left:5px;'>").text(annot.colType).appendTo(".googlechartAnnotationColumnType");
    if (annot.colType === 'base') {
      return;
    }
    $("<tr>").addClass("googlechartAnnotationColumnName").appendTo(".googlechartAnnotationViewerTable");
    $("<td>").text("Column Name:").appendTo(".googlechartAnnotationColumnName");
    $("<td style='font-weight:bold; padding-left:5px;'>").text(annot.colName).appendTo(".googlechartAnnotationColumnName");
    $("<tr>").addClass("googlechartAnnotationValueType").appendTo(".googlechartAnnotationViewerTable");
    $("<td>").text("Value Type:").appendTo(".googlechartAnnotationValueType");
    $("<td style='font-weight:bold; padding-left:5px;'>").text(annot.valType).appendTo(".googlechartAnnotationValueType");
  };

  EEAGoogleChartsUnpivotAnnotation.prototype.changeTextArea = function() {
    var colName, colType, obj, valType;
    colType = $(".googlechartAnnotationColumnType select option:selected").attr("value");
    colName = jQuery(".googlechartAnnotationColumnName input").attr("value");
    valType = jQuery(".googlechartAnnotationValueType select option:selected").attr("value");
    obj = {};
    obj.colType = colType;
    obj.colName = colName;
    obj.valType = valType;
    $("li.annotator-item textarea").attr("value", JSON.stringify(obj));
    if (colType === 'base') {
      $(".googlechartAnnotationColumnName").hide();
      $(".googlechartAnnotationValueType").hide();
    } else {
      $(".googlechartAnnotationColumnName").show();
      $(".googlechartAnnotationValueType").show();
    }
  };

  EEAGoogleChartsUnpivotAnnotation.prototype.getAnnotations = function() {
    return $('.annotator-hl').addBack().map(function() {
      return $(this).data("annotation");
    });
  };

  return EEAGoogleChartsUnpivotAnnotation;

})(Annotator.Plugin);

/*
//
*/

//@ sourceMappingURL=annotator-full.map;
define("annotator", function(){});
