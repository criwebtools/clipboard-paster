/**
 * jQuery function to center element within viewport.
 * 
 * ref: https://stackoverflow.com/questions/210717/using-jquery-to-center-a-div-on-the-screen
 */
$.fn.y3center = function () {
    this.css("position","absolute");
    this.css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) + 
                                                $(window).scrollTop()) + "px");
    this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) + 
                                                $(window).scrollLeft()) + "px");
    return this;
}

Yes3.MONITOR_INTERVAL = 100; // mutation monitor interval, ms

Yes3.windowNumber = 0; // used in the naming of popups

Yes3.labels = {
    'click_to_paste': 'Click here to paste an image from the clipboard.',
    'remove_before_replace': 'To replace this image, first remove it.',
    'double_click_to_open': 'Double-click to view full-size image in a separate window.',
    'no_image_on_clipboard': 'No can do: the clipboard contains non-image data.',
    'paste_failed': 'The paste operation failed: see the console log for details.',
    'click_to_close': 'Cick here to close this message.'
}

/**
 * Take care of the various UI renovations
 */
Yes3.UI = function(){

    /**
     * support for pasteable upload fields
     */
    Yes3.UI_UploadFields();

    /**
     * textarea relocations
     */
    if ( Yes3.notes_field_layout==='enhanced' ){
        
        Yes3.UI_NotesFields();
    }

    Yes3.UI_Copyright();
}

/**
 * Inserts a new full-width image container just below each upload
 * field marked with @INLINE.
 * 
 * These 'pasteable fields' are identified in the EM hook function and
 * passed in the global array Yes3.pasteable_fields.
 */
Yes3.UI_UploadFields = function() {
    
    for(let i=0; i<Yes3.pasteable_fields.length; i++){

        if ( Yes3.upload_field_layout!=='enhanced' ){

            continue;
        }

        const $itemContainerRow = $(`tr#${Yes3.pasteable_fields[i]}-tr`);

        const $imageRow = $('<tr>', {

            'class': 'yes3-inline-image-row',
            'field_name': Yes3.pasteable_fields[i],
            'id': `yes3-inline-image-row-${Yes3.pasteable_fields[i]}`

        }).append($('<td>', {

            'colspan': '2',
            'class': 'yes3-inline-image-container',
            'data-field_name': Yes3.pasteable_fields[i],
            'id': `yes3-inline-image-${Yes3.pasteable_fields[i]}`
        }))

        $itemContainerRow.after( $imageRow );
    }
}

/**
 * Relocates each notes field to a new full-width container just beneath the original container
 * (which retains label and history/comment buttons).
 */
Yes3.UI_NotesFields = function() {

    const $textFields = $('textarea.notesbox');

    $textFields.each(function(){

        const $tr = $(this).closest('tr');

        const field_name = $(this).attr('name');

        $(this).addClass('yes3-textarea');

        $inputRow = $('<tr>', {
                'class': 'yes3-textarea-row',
                'field_name': field_name,
                'id': `yes3-textarea-row-${field_name}`
            })
            .append( $('<td>', {
                'colspan': '2',
                'class': 'yes3-textarea',
                'field_name': field_name,
                'id': `yes3-textarea-${field_name}`
                }).append( $(this) )
            )
        ;

        $tr.after( $inputRow );

        // remove the 'expand' link, cuz these are resizable fields
        $(`div#${field_name}-expand`).remove();
    });
}

// a bit tongue-in-cheeky
Yes3.UI_Copyright = function(){

    $('div#south td:nth-child(2)').append(`<span class='nowrap'>&nbsp;|&nbsp;Clipboard Paster &copy;2023 by REDCap@Yale.</span>`)
}

/**
 * Opens an image in a popup window
 * 
 * Attempts to size the window to the underlying image size,
 * but if too large will rescale to the width of the current window.
 * 
 * @param {*} img 
 */
Yes3.openInlineImage = function( img ) {

    let w = img.naturalWidth;
    let h = img.naturalHeight;
/*
    let r = h / w;

    let W = window.innerWidth;

    if ( w > W ){

        w = W;

        h = W * r;
    }
*/
    const popup = Yes3.openPopupWindow( img.src, w+1, h+1 );

    if ( !popup ){

        console.log('popup blocked');

        // open in tab
        window.open( img.src, '_blank' );
    }
}

/**
 * ref: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/read
 * 
 * TESTED ON v12.5
 * 
 * Uses the clipboard API to read image from the clipboard.
 * 
 * Uploads the image by simulating a signature upload:
 *  (1) Uses Filereader to convert image to base64 encoding.
 *  (2) Opens the REDCap upload dialog with the REDCap filePopUp() function.
 *  (3) Populates the myfile_base64 input with the base64 encoded image.
 *      This is interpreted as a signature image in DataEntry/file_upload.php 
 *  (4) Triggers the form's submit action.
 * 
 * After the form is submitted, the inline image is rendered by REDCap.
 * 
 * Within 100ms the 'mutation monitor' Yes3.Monitor_UploadFieldActions() will pick up the image rendering,
 * and if the enhanced UI setting is selected, will relocate the image to the full-width container
 * that was injected on form load by Yes3.UI_UploadFields().
 * 
 * @param {*} field_name 
 */
Yes3.pasteImage = async function ( field_name ) {
    try {

        const permission = await navigator.permissions.query({ name: 'clipboard-read' });

        if (permission.state === 'denied') {
            throw new Error('Not allowed to read clipboard.');
        }

        const clipboardContents = await navigator.clipboard.read();

        for (const item of clipboardContents) {

            if (!item.types.includes('image/png')) {

                Yes3.notAnImage(field_name);

                return;
            }

            const blob = await item.getType('image/png');

            const base64data = await Yes3.blobToBase64(blob);

            const $container = $(`td#yes3-inline-image-${field_name}`);

            const $img = $('<img>', {
                'src': URL.createObjectURL(blob)
            })
            .addClass('yes3-file-upload-inline');

            $container
                .empty()
                .append( $img )
            ;

            filePopUp(field_name,0,0);

            // fill out the popup form as if it were a signature
            $('form#form_file_upload').find('input[name=myfile_base64]').val(base64data);

            $('form#form_file_upload').trigger('submit');
        }
    }
    catch (e) {
        console.error(e);
        Yes3.postErrorMessage( Yes3.labels.paste_failed );
    }
}

// displays a red 'not an image' message in the paste region for 3 seconds
Yes3.notAnImage = function( field_name ){

    Yes3.postErrorMessage( Yes3.labels.no_image_on_clipboard);
}

Yes3.Monitor = function(){

    Yes3.Monitor_BranchingActions();
    Yes3.Monitor_UploadFieldActions();
}

/**
 * Reacts to branching logic affecting notes fields managed by this EM.
 * Specifically, shows or hides the inserted rows
 * that contain the relocated inline images and notes controls,
 * based on the visibility of the original field rows
 * which now contain the field labels and sundries.
 */
Yes3.Monitor_BranchingActions = function(){

    $('tr.yes3-inline-image-row, tr.yes3-textarea-row').each(function(){

        if ( $(this).prev().is(':visible') ){

            if ( !$(this).is(":visible") ) $(this).show();
        }
        else {

            if ( $(this).is(":visible") ) $(this).hide();
        }
    })
}

/**
 * Reacts to user paste, upload and remove actions:
 *  (1) After upload: Relocates inline image to the inserted full-width container.
 *  (2) After remove: Empties the inserted full-width container
 */
Yes3.Monitor_UploadFieldActions = function(){
   
    for(let i=0; i<Yes3.pasteable_fields.length; i++){

        const field_name = Yes3.pasteable_fields[i];

        const $linkContainer = $(`div#${field_name}-linknew`);

        const $hasDataLinkContainer = $linkContainer.find('span.edoc-link');

        const $fileUploadContainer = $(`#fileupload-container-${field_name}`);

        // The normal REDCap inline image
        // after form render or upload the inline image will displayed 
        // in the original field row (and must be moved).
        const $inLineImage = $fileUploadContainer.find('img.file-upload-inline');

        const hasData = $fileUploadContainer.find(`a#${field_name}-link`).is(':visible');

        if ( hasData && $inLineImage.length && !$inLineImage.hasClass('yes3-handled')) {

            $inLineImage
                .off('dblclick')
                .on('dblclick', function(){Yes3.openInlineImage( this )})
                .attr('title', Yes3.labels.double_click_to_open + "\n" + Yes3.labels.remove_before_replace)
                .addClass('yes3-handled')
                ;
        }

        /**
         * Insert the paste link if not already rendered
         */
        if ( !$fileUploadContainer.find('.yes3-paste-link').length){

            const $fileUploadLink = $fileUploadContainer.find('a.fileuploadlink');

            const pasteLinkFontSize = $fileUploadLink.css('font-size');

            const $pasteLinkContainer = $('<span>', {

                'class': 'yes3-paste-link',
                'style': `font-size:${pasteLinkFontSize}`
            });

            const $delim = $('<span>',{
                'style': 'padding:0 10px',
                'html': 'or'
            });
            
            const $pasteLink = $('<a>', {
                'href': 'javascript:;',
                'class': 'd-print-none yes3-paste-link',
                'title': Yes3.labels.click_to_paste,
                'style': `font-size:${pasteLinkFontSize};`,
                'aria-label': Yes3.labels.click_to_paste,
                'html': ( hasData ) ? "<i class='fa fa-clipboard mr-1'></i>" : "<i class='fa fa-clipboard mr-1'></i>Paste image"
            }).on('click', function(){Yes3.pasteImage(field_name)} );

            $pasteLinkContainer.append( $delim );

            $pasteLinkContainer.append( $pasteLink );

            $linkContainer.append( $pasteLinkContainer );

            /**
             * Tighten up the spacing in the link containter, to make space for the new 'paste image' links 
             */
            $linkContainer.find('*').each(function(){

                const padR = parseFloat($(this).css('padding-right'))/2.0;
                const padL = parseFloat($(this).css('padding-right'))/2.0;
            
                $(this).css('padding-right', padR+'px');
                $(this).css('padding-left', padL+'px');

                //console.log('linkContainer', field_name, this, $(this).css('padding-right'), padL, padR, $(this).html().indexOf('&nbsp;'));
            })

            /**
             * the 'edoc' link container has an annoying trailing hard space
             */
            if ( hasData ){

                $hasDataLinkContainer.html( $hasDataLinkContainer.html().replaceAll('&nbsp;', '') );

                //console.log( 'check ==>', $hasDataLinkContainer.html() );

                // remove the file name if this is an image paste, since it looks strange
                $(`a#${field_name}-link`).find('span').text('download');
            }
        }

        /**
         * all done if the enhanced layout is disabled
         */
        if ( Yes3.upload_field_layout !== 'enhanced' ){

            continue;
        }

        const $fullwidthImageContainer = $(`td#yes3-inline-image-${field_name}`);

        if ( !hasData ){

            // if upload has been removed but relocated upload image remains, remove it
            $fullwidthImageContainer.hide().find('img').remove();

            // if relocated image container is empty (no image or 'click here..' text),
            // populate it with the default 'click here..' message and add the listener
            // (disabled for now)
            if ( !$fullwidthImageContainer.html().length && false ){

                $fullwidthImageContainer
                    .addClass('yes3-clickable')
                    .attr('title', Yes3.labels.click_to_paste)
                    .html(Yes3.labels.click_to_paste)
                    .off('click')
                    .on('click', function(){ Yes3.pasteImage(field_name) } )
                ;
            }
        }
        else {
            // Upload field populated with REDCap inline image still displayed,
            // so relocate image to inserted fill-width image container.
            if ( $inLineImage.length ){

                $fullwidthImageContainer
                    .empty()
                    //.removeClass('yes3-clickable')
                    .append($inLineImage)
                    //.off('click')
                    .show()
                ;
                
                // Replace the image styling class
                $inLineImage
                    .removeClass('file-upload-inline')
                    .addClass('yes3-file-upload-inline')
                ;
            }
        }
    }
}

/**
 * A mutation monitor, tailored to branching, upload and paste actions
 */
Yes3.startMonitoring = function(){

    setInterval(Yes3.Monitor, Yes3.MONITOR_INTERVAL);
}

/**
 * ref: https://stackoverflow.com/questions/18650168/convert-blob-to-base64
 * 
 * modified to remove small header inserted by Filereader
 * 
 * @param {*} blob 
 * @returns 
 */
Yes3.blobToBase64 = function(blob) {
    return new Promise((resolve, _) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob); // returns base64 encoded data
    });
}

/**
 * opens a window centered on the screen
 * 
 * @param {*} url 
 * @param {*} w 
 * @param {*} h 
 * @param {*} windowNamePrefix 
 * @returns 
 */
Yes3.openPopupWindow = function(url, w, h, windowNamePrefix) {

    w = w || 800;
    h = h || 600;
    windowNamePrefix = windowNamePrefix || "ClipboardPaster";

    Yes3.windowNumber++;

    let windowName = windowNamePrefix+Yes3.windowNumber;

    // Fixes dual-screen position                         Most browsers      Firefox
    let dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : window.screenX;
    let dualScreenTop = window.screenTop != undefined ? window.screenTop : window.screenY;

    let width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    let height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

    let left = ((width / 2) - (w / 2)) + dualScreenLeft;
    let top = ((height / 2) - (h / 2)) + dualScreenTop;
    let newWindow = window.open(url, windowName, 'width=' + w + ',height=' + h + ',top=' + top + ',left=' + left);

    if(!newWindow || newWindow.closed || typeof newWindow.closed=='undefined')   {
        return false;
    }

    return true;
}

Yes3.postErrorMessage = function( msg ){
    
    $ele = $('<div>', {

        'class': 'yes3-error-message-container',
        'title': Yes3.labels.click_to_close,
        'html': "<p>" + msg + "</p><p class='yes3-subtle yes3-small yes3-centered'>click here to close this message</p>"
    });

    $('body').append( $ele );

    $ele
        .y3center()
        .on('click', function(){Yes3.removeErrorMessage()} )
        .show()
    ;

    setTimeout( function(){

        $ele.remove();
    
    }, 10000);
}

Yes3.removeErrorMessage = function(){

    $('div.yes3-error-message-container').remove();
}

$(function(){

    console.log('welcome to clipboard paster');

    Yes3.UI(); // UI renovations

    Yes3.startMonitoring(); // start the mutation monitor (branching, pasting, upload reactions)
})