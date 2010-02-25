if (!window.gettext) gettext = function(s) { return s };
if (!window.carp) carp = function() {
    try {
        $('#debug').append($('<p>').text($.makeArray(arguments).join(' ')));
    } catch(e) { }
    try {
        console.log.apply(this, arguments);
    } catch(e) {
        try {
            console.log(arguments[0]);
        } catch(e) { }
    }
};

( function($) {
    /* SETTINGS */
    var date_input_class     = 'vDateInput';
    var datetime_input_class = 'vDateTimeInput';
    var cal_icon_src = 'cal.png'
    var timepicker_html
        = '<a class="icn cancel js-dtpicker-close">'+gettext('Close')+'</a>\n'
        + '<a class="icn history js-timepick js-time-now">'+gettext('Now')+'</a>\n'
        + '<a class="icn history js-timepick js-time-0600">'+gettext('6am')+'</a>\n'
        + '<a class="icn history js-timepick js-time-1200">'+gettext('Noon')+'</a>\n'
    ;
    /* END OF SETTINGS */
    
    var date_input_selector     = '.'+date_input_class;
    var datetime_input_selector = '.'+datetime_input_class;

    function GenericDTInput(input) {
        this.input = input;
        this.cursor_pos = function(evt) {
            var input = this.input;
            if (!this.x_pos) this.x_pos = $(input).offset().left;
            var input_style;
            try {
                input_style = getComputedStyle(input, '');
            } catch(e) {
                input_style = input.currentStyle;
            }
            if (input_style == undefined) input_style = {};
            
            var padding = input_style.paddingLeft || input_style['padding-left'];
            if (/^(\d+)(?:px)?$/.test(padding)) padding = new Number(RegExp.$1);
            else padding = 0;
            var border = input_style.borderLeftWidth || input_style['border-left-width'];
            if (/^(\d+)(?:px)?$/.test(border )) border  = new Number(RegExp.$1);
            else border = 0;
            
            var x = evt.clientX - this.x_pos - padding - border;
            
            var $tempspan = $('#datetime-temp');
            if ($tempspan.length == 0) $tempspan = $('<span>').css({
                position: 'absolute',
                top: '-100px'
            }).attr('id', 'datetime-temp');
            for (var property in input_style) {
                
                if (property >= 0) property = input_style[ property ];  // XXX nasty Chrome hack
                
                if (property.substr(0, 4) == 'font' && input_style[property]) {
                    $tempspan.css(property, input_style[property]);
                }
            }
            $tempspan.insertAfter($(input));
            
            $tempspan.text('m');
            var dotwidth = -$tempspan.width();
            $tempspan.text('m.');
            dotwidth += $tempspan.width();
            $tempspan.text( $(input).val() + '.' );
            
            var text, last = '';
            while ($tempspan.width() - dotwidth >= x) {
                text = $tempspan.text();
                if (text == '.') break;
                text = text.substr(0,text.length-1);
                last = text.substr(text.length-1);
                $tempspan.text(
                    text.substr(0, text.length-1) + '.'
                );
            }
            text = $tempspan.text();
            text = text.substr(0, text.length-1) + last;
            return text.length;
        };
        this.onFormSubmit = function(evt, re, input_selector) {
            var is_ok = true;
            $(evt.target).find(input_selector).each( function() {
                if (re.test($(this).val())) {} else {
                    $(this).trigger('failed_validation');
                    is_ok = false;
                }
            });
            if (! is_ok) evt.preventDefault();
        };
    }
    window.GenericDTInput = GenericDTInput;
    
    GenericDTInput.prototype.set_caret = function(el, pos) {
        if (document.selection) {
            $(el).focus();
            var range = document.selection.createRange();
            range.moveStart('character', -$(el).val().length);
            range.moveEnd('character', -$(el).val().length);
            range.moveStart('character', pos);
            range.moveEnd('character', 0);
            range.select();
        }
        else if (el.setSelectionRange) {
            el.setSelectionRange(pos, pos);
        }
    };
    GenericDTInput.prototype.get_caret = function(el) {
        var result = {start:0, end:0, caret:0};
        $(el).focus();
        
        if (document.selection) {
            var range = document.selection.createRange();
            var r2 = range.duplicate();         
            result.start = 0 - r2.moveStart('character', -$(el).val().length);
            result.end = result.start + range.text.length;  
            result.caret = result.end;
        } else {
            result.start = el.selectionStart;
            result.end = el.selectionEnd;
            result.caret = result.end;
        }
        if (result.start < 0) {
             result = {start:0, end:0, caret:0};
        }   
        return result;
    };

    function DateTimeInput(input) {
        var self = new GenericDTInput(input);
        self.fields_re = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/;
        self.set_date = function(d, preserve) {
            var fields = this.fields_re.exec( $(this.input).val() );
            var year, month, day, hour, minute, dow;
            if (!fields) preserve = {};
            else {
                year   = fields[1];
                month  = fields[2];
                day    = fields[3];
                hour   = fields[4];
                minute = fields[5];
                month = new Number(month) - 1;
            }
            if (!preserve) preserve = { };
            
            if (preserve.year  ) d.setFullYear(year  );
            if (preserve.month ) d.setMonth   (month );
            if (preserve.day   ) d.setDate    (day   );
            if (preserve.hour  ) d.setHours   (hour  );
            if (preserve.minute) d.setMinutes (minute);
            
            year = d.getFullYear();
            month = new Number(d.getMonth()) + 1;
            day = d.getDate();
            hour = d.getHours();
            minute = d.getMinutes();
            dow = $.datepicker._defaults.dayNamesMin[ d.getDay() ];
            
            function pad(str,n) {
                var s = new String(str);
                while (s.length < n) s = '0'+s;
                return s;
            }
            
            var nval = ''
            + pad(  year,4) + '-'
            + pad( month,2) + '-'
            + pad(   day,2) + ' '
            + pad(  hour,2) + ':'
            + pad(minute,2) + ' '
            + dow;
            $(this.input).val( nval ).change();
        };
        self.scroll = function(pos, delta) {
            var input = this.input;
            var fields = this.fields_re.exec( $(input).val() );
            if (!fields) {
                carp('Invalid date:', $(input).val());
                return;
            }
            
            var i = ([
                undefined,
                1,1,1,1,
                undefined,
                2,2,
                undefined,
                3,3,
                undefined,
                4,4,
                undefined,
                5,5,
                undefined,
                3,3
            ])[pos];
            if (i == undefined) return;
            fields[i] = new Number(fields[i]) + delta;
            
            var year   = fields[1];
            var month  = fields[2];
            var day    = fields[3];
            var hour   = fields[4];
            var minute = fields[5];
            month = new Number(month) - 1;
            
            var d = new Date();
            d.setFullYear(year);
            d.setMonth(month);
            d.setDate(day);
            d.setHours(hour);
            d.setMinutes(minute);
            d.setSeconds(0);
            d.setMilliseconds(0);
            
            this.set_date(d);
            
            this.set_caret(input, pos);
        };
        var $f = $(input).closest('form');
        if (!$f.data('submit_event_bound')) {
            $f.data('submit_event_bound', true);
            $f.submit( function(evt) {
                self.onFormSubmit(
                    evt,
                    /^(\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)( \w+)?)?$/,
                    datetime_input_selector
                );
            });
        }
        return self;
    }
    window.DateTimeInput = DateTimeInput;

    function DateInput(input) {
        var self = new GenericDTInput(input);
        self.fields_re = /^(\d{4})-(\d{2})-(\d{2})/;
        self.set_date = function(d, preserve) {
            var fields = this.fields_re.exec( $(this.input).val() );
            var year, month, day,  dow;
            if (!fields) preserve = {};
            else {
                year   = fields[1];
                month  = fields[2];
                day    = fields[3];
                month = new Number(month) - 1;
            }
            if (!preserve) preserve = { };
            
            if (preserve.year ) d.setFullYear(year );
            if (preserve.month) d.setMonth   (month);
            if (preserve.day  ) d.setDate    (day  );
            
            year = d.getFullYear();
            month = new Number(d.getMonth()) + 1;
            day = d.getDate();
            dow = $.datepicker._defaults.dayNamesMin[ d.getDay() ];
            
            function pad(str,n) {
                var s = new String(str);
                while (s.length < n) s = '0'+s;
                return s;
            }
            
            var nval = ''
            + pad(  year,4) + '-'
            + pad( month,2) + '-'
            + pad(   day,2) + ' '
            + dow;
            $(this.input).val( nval ).change();
        };
        self.scroll = function(pos, delta) {
            var input = this.input;
            var fields = this.fields_re.exec( $(input).val() );
            if (!fields) {
                carp('Invalid date:', $(input).val());
                return;
            }
            
            var i = ([
                undefined,
                1,1,1,1,
                undefined,
                2,2,
                undefined,
                3,3,
                undefined,
                3,3
            ])[pos];
            if (i == undefined) return;
            fields[i] = new Number(fields[i]) + delta;
            
            var year   = fields[1];
            var month  = fields[2];
            var day    = fields[3];
            month = new Number(month) - 1;
            
            var d = new Date();
            d.setFullYear(year);
            d.setMonth(month);
            d.setDate(day);
            d.setHours(0);
            d.setMinutes(0);
            d.setSeconds(0);
            d.setMilliseconds(0);
            
            this.set_date(d);
            
            this.set_caret(input, pos);
        };
        var $f = $(input).closest('form');
        if (!$f.data('submit_event_bound')) {
            $f.data('submit_event_bound', true);
            $f.submit( function(evt) {
                self.onFormSubmit(
                    evt,
                    /^(\d{4}-\d{2}-\d{2}( \w+)?)?$/,
                    date_input_selector
                );
            });
        }
        return self;
    }
    window.DateInput = DateInput;



    $('span.dtpicker-trigger').live('click', function() {
        var $dtp = $('.datetimepicker');
        var x,y,this_y,h;
        x = $(this).offset().left + $(this).width();
        y = this_y = $(this).offset().top;
        h = $dtp.outerHeight();
        var $input = $(this).data('input');
        var scrolltop = $().scrollTop();
        
        // fine-tune the vertical position of the datetimepicker
        var d = y + h - $(window).height() - scrolltop;
        var topstop = this_y + $(this).outerHeight() - h;
        if (d > 0) y -= d;  // check if Y doesn't reach below the current screen height
        if (y < scrolltop) y = scrolltop;   // but rather reach below bottom than above top
        if (y < topstop  ) y = topstop;     // and always stay touching the trigger icon
        
        $dtp.css({
            top : y + 'px',
            left: x + 'px'
        }).toggle().data( 'input', $input );
        
        if ($input.is(datetime_input_selector)) {
            $dtp.find('.timepicker').show();
        }
        else if ($input.is(date_input_selector)) {
            $dtp.find('.timepicker').hide();
        }
    });
    
    function datetime_init() {
        $([datetime_input_selector,date_input_selector].join(',')).each( function() {
            var $input = $(this);
            var is_datetime = $input.hasClass(datetime_input_selector);
            if (! $input.data('dti')) {
                if (is_datetime) {
                    $input.data('dti', new DateTimeInput(this));
                }
                else {
                    $input.data('dti', new DateInput(this));
                }
                
                $(  '<span class="dtpicker-trigger"><img src="'
                    + cal_icon_src
                    + '" alt="cal" /></span>'
                )
                .data('input', $input)
                .insertAfter(this);
                
                $input.keydown(function(evt) {
                    var $dti = $input.data('dti');
                    var delta = 0;
                    if (evt.keyCode == 38) delta =  1;
                    if (evt.keyCode == 40) delta = -1;
                    if (!delta) return true;
                    var pos = $dti.get_caret(this).caret;
                    $dti.scroll(pos, delta);
                    evt.preventDefault();
                });
            }
        });
    }
    $(datetime_init);

    function media_dependent_datetime_init(evt) {
        
        // create the datetimepicker div
        if ($('.datetimepicker').length) { }    // but only if there is none yet
        else if (
               evt.type == 'content_added'  // and we added something that uses a datepicker
            && $(evt.target).find('.dtpicker-trigger').length == 0    // if anything
        ) { }
        else {
            // Container creation
            var $dtpicker = $('<div class="datetimepicker">');
            
            // Date picker
            var $datepicker = $('<div class="datepicker">');
            $datepicker.datepicker({
                onSelect: function(dtext, dpick) {
                    var $dtpicker = $(this).closest('.datetimepicker');
                    var $input = $( $dtpicker.data('input') );
                    var dti = $input.data('dti');
                    var d = new Date();
                    d.setFullYear(dpick.selectedYear);
                    d.setMonth(dpick.selectedMonth);
                    d.setDate(dpick.selectedDay);
                    d.setHours(0);
                    d.setMinutes(0);
                    d.setSeconds(0);
                    d.setMilliseconds(0);
                    dti.set_date(d, {/*preserve*/hour:true,minute:true});
                    if ($input.is(date_input_selector)) {
                        $(this).closest('.datetimepicker').hide();
                        $input.focus();
                    }
                },
                onClose: function() {
                    $(this).closest('.datetimepicker').hide();
                }
            });
            $datepicker.appendTo($dtpicker);
            
            // Time picker
            var $timepicker = $('<div class="timepicker">')
            .html(timepicker_html).appendTo($dtpicker);
            
            
            // Container placement
            $dtpicker.appendTo(
                   $('.change-form').get(0)
                || $('#content').get(0)
                || $('body').get(0)
            );
        }
        
        // mousewheel datetime scrolling
        function mousewheel_handler(evt, delta) {
            var dti = $(this).data('dti');
            var pos = dti.cursor_pos(evt);
            dti.scroll(pos, delta / Math.abs(delta||1));
            evt.preventDefault();
        };
        //if (DEBUG)  // FIXME: mousewheel scrolling broken!
        $([datetime_input_selector,date_input_selector].join(',')).not('.mwheel-enhanced').focus( function() {
            $(this)  .bind('mousewheel', mousewheel_handler);
        }).blur( function() {
            $(this).unbind('mousewheel', mousewheel_handler);
        }).addClass('mwheel-enhanced');
    }
    
    $('.js-dtpicker-close').live('click', function(evt) {
        if (evt.button != 0) return;
        $(this).closest('.datetimepicker').hide();
    });
    $('.js-timepick').live('click', function(evt) {
        if (evt.button != 0) return;
        var dti = $( $(this).closest('.datetimepicker').data('input') ).data('dti');
        var selected_time = /js-time-(\d\d)(\d\d)/.exec(this.className);
        var d = new Date();
        d.setSeconds(0);
        d.setMilliseconds(0);
        if ( ! selected_time ) {
            if ( ! $(this).hasClass('js-time-now') ) return;
        }
        else {
            var selected_hours   = selected_time[1];
            var selected_minutes = selected_time[2];
            d.setHours  (selected_hours  );
            d.setMinutes(selected_minutes);
            // let default date be the following 24 hours
            if (d.getTime() < new Date().getTime()) {
                d.setDate( d.getDate() + 1 );
            }
        }
        dti.set_date(d, {/*preserve*/year:true,month:true,day:true});
    });
    
    $( document ).bind('content_added', datetime_init);
    $( document ).bind('content_added', media_dependent_datetime_init);
    $( document ).one ('ready' , media_dependent_datetime_init);
    
    // Close the datetimepicker when something else is clicked
    $('body').live('click', function(evt) {
        // ignore clicking on the datepicker triggering icon
        if ($(evt.target).closest('.dtpicker-trigger').length) return true;
        // ignore clicking on the datepicker itself
        if ($(evt.target).closest('.datetimepicker').length)   return true;
        // if there's no datepicker shown, don't attempt to hide it
        if ($('.datetimepicker').not(':hidden').length == 0)   return true;
        // all else failed, hide all present datepickers
        $('.datetimepicker').hide();
        // and let the click be processed as usual
        return true;
    });

})(jQuery);
