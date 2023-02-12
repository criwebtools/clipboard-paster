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

Yes3.DOWNLOAD_IMAGE_TEXT = 'download image';

Yes3.windowNumber = 0; // used in the naming of popups

Yes3.clipboardApiIsSupported = false;
Yes3.clipboardApiPermission = "";

// for eventual multilanguage support
Yes3.labels = {
    'click_to_paste':               'Click here to paste an image from the clipboard.',
    'remove_before_replace':        'To replace this image, first remove it.',
    'double_click_to_open':         'Double-click to view full-size image in a separate window.',
    'no_image_on_clipboard':        'No can do: the clipboard contains non-image data. See the console log for details.',
    'paste_failed':                 'The paste operation failed: see the console log for details.',
    'click_to_close_message':       'Click here to close this message.',
    'paste_image_here':             'Paste image here',
    'paste_image_here_tooltip':     'Click here, and then paste the image using Ctrl-V, the context menu (right-click) or whatever is appropriate for this browser.',
    'see_console_log':              'See console log for details.',
    'clipboard_permission_denied':  'Permission to access the clipboard is denied. See the EM documentation for instructions to allow access for your browser.'
}

/**
 * Determines whether clipboard API is supported by this browser.
 * Sets Yes3.clipboardApiIsSupported
 * 
 */
Yes3.isClipboardApiSupported = async function(){

    try {

        const perm = await navigator.permissions.query({ name: 'clipboard-read' });

        Yes3.clipboardApiIsSupported = true;
        Yes3.clipboardApiPermission = perm.state;
    }
    catch(e) {

        console.log('Yes3.isClipboardApiSupported: ', e);

        Yes3.clipboardApiIsSupported = false;
        Yes3.clipboardApiPermission = "unavailable";
    }
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

        const field_name = Yes3.pasteable_fields[i];

        const $fileUploadContainer = $(`#fileupload-container-${field_name}`);

        const $itemContainerRow = $(`tr#${field_name}-tr`);

        const $pasteTarget = $('<textarea>', {
            'id': 'yes3-paste-' + field_name,
            'class': 'yes3-paste-target yes3-paste',
            'text': Yes3.labels.paste_image_here,
            'title': Yes3.labels.paste_image_here_tooltip
            })
            .attr('yes3-field-name', field_name)
        ;

        $fileUploadContainer.prepend( $pasteTarget );

        if ( Yes3.upload_field_layout!=='enhanced' ){

            continue;
        }

        const $imageRow = $('<tr>', {

            'class': 'yes3-inline-image-row',
            'field_name': field_name,
            'id': `yes3-inline-image-row-${field_name}`

        }).append($('<td>', {

            'colspan': '2',
            'class': 'yes3-inline-image-container',
            'data-field_name': field_name,
            'id': `yes3-inline-image-${field_name}`
        }))

        $itemContainerRow
            .before( $imageRow )
            .addClass('yes3-uploadcontainer-row')
        ;
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
                'class': 'yes3-textarea-input-row',
                'field_name': field_name,
                'id': `yes3-textarea-input-row-${field_name}`
            })
            .append( $('<td>', {
                'colspan': '2',
                'class': 'yes3-textarea',
                'field_name': field_name,
                'id': `yes3-textarea-${field_name}`
                }).append( $(this) )
            )
        ;

        $tr
            .addClass('yes3-textarea-parent-row')
            .after( $inputRow )
        ;

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

    let W = window.innerWidth;
    let H = window.innerHeight;

    if ( w > W ){

        w = W;
    }

    if ( h > H ){

        h = H;
    }

    //console.log(w, h);

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
 * For browsers that support the Clipboard API ( chrome, edge, safari/macOS ).
 * 
 * If the clipboard includes an item whose type includes 'image',
 * that item is read into a blob and Yes3.uploadClipboardImage() is called.
 * 
 * @param {*} field_name 
 */
Yes3.processClipboardImage = async function ( field_name ) {
    try {

        let type = '';

        const permission = await navigator.permissions.query({ name: 'clipboard-read' });

        if (permission.state === 'denied') {

            throw new Error( Yes3.labels.clipboard_permission_denied );
        }

        const clipboardContents = await navigator.clipboard.read();

        for (const item of clipboardContents) {

            for(let i=0; i<item.types.length; i++){

                if ( item.types[i].indexOf('image') !== -1 ){

                    const blob = await item.getType( item.types[i] );

                    Yes3.uploadClipboardImage(field_name, blob);

                    return;
                }
                else if ( item.types[i].length ) {

                    if ( type.length ) type += ',';

                    type += item.types[i];
                }
            }
        }

        console.warn(`Attempt to paste non-image data type(s)='${type}', clipboardContents:`, clipboardContents);
        
        Yes3.postErrorMessage( Yes3.labels.no_image_on_clipboard );
    }
    catch (e) {

        console.error(e);

        Yes3.postErrorMessage( `${e}<br>${Yes3.labels.see_console_log}`);
    }
}
/**
 * Uploads the image by simulating a signature upload:
 * 
 *  (1) Uses Filereader to convert image to base64 encoding ( via Yes3.blobToBase64(() )
 *  (2) Opens the REDCap upload dialog with the REDCap filePopUp() function.
 *  (3) Populates the myfile_base64 input with the base64 encoded image.
 *      This is interpreted as a signature image in DataEntry/file_upload.php 
 *  (4) Triggers the form's submit action.
 * 
 * After the form is submitted, the inline image is rendered by REDCap.
 * 
 * Within 100ms the 'mutation monitor' Yes3.Monitor_UploadFieldActions() will pick up the image rendering,
 * and if the enhanced UI setting is selected, will relocate the image to the full-width container
 */

Yes3.uploadClipboardImage = async function( field_name, blob ){

    try {

        const base64data = await Yes3.blobToBase64(blob);

        filePopUp(field_name,0,0);

        // fill out the popup form as if it were a signature
        $('form#form_file_upload').find('input[name=myfile_base64]').val(base64data);

        $('form#form_file_upload').trigger('submit');

        // in case the alternate approach was taken..
        $('.yes3-alt-paste-container').remove()
    }
    catch(e) {

        Yes3.postErrorMessage(e);
    }
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

    $('tr.yes3-inline-image-row, tr.yes3-textarea-input-row').each(function(){

        const field_name = $(this).attr('field_name');

        if ( $(`tr#${field_name}-tr`).is(':visible') ){

            if ( $(this).is(":hidden") ) $(this).show();
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

    let K = 0; // count of mutation reactions
   
    for(let i=0; i<Yes3.pasteable_fields.length; i++){

        const field_name = Yes3.pasteable_fields[i];

        // skip fields hidden through branching logic

        if ( $(`tr#${field_name}-tr`).is(':hidden') ) {

            continue;
        }

        const $linkContainer = $(`div#${field_name}-linknew`);

        const $fileUploadContainer = $(`#fileupload-container-${field_name}`);

        // The normal REDCap inline image
        // after form render or upload the inline image will displayed 
        // in the original field row (and must be moved).
        const $inLineImage = $fileUploadContainer.find('img.file-upload-inline');

        // if the download link is visible we conclude that the upload has been made, hence has data
        const hasData = $fileUploadContainer.find(`a[name=${field_name}]`).is(':visible');

        //const hasData = $edocLinkSpan.length;

        /**
         * If the download link is visible:
         * 
         * (1) Add double-click listener for inline image (opens new window)
         * (2) Replace the system download link name pattern "signature*" with "download".
         *      (uploaded images are interpreted as signatures)
         * 
         */
        if ( hasData ) {

            if ( $inLineImage.length && !$inLineImage.hasClass('yes3-handled')) {

                $inLineImage
                    .off('dblclick')
                    .on('dblclick', function(){Yes3.openInlineImage( this )})
                    .attr('title', Yes3.labels.double_click_to_open)
                    .attr('field_name', field_name)
                    .addClass('yes3-handled')
                ;
                K++;
            }
    
            if ( $(`a#${field_name}-link`).find('span').text().indexOf('signature_') !== -1){
    
                $(`a#${field_name}-link`).find('span').text(Yes3.DOWNLOAD_IMAGE_TEXT);
                K++;            
            }
        }

        /**
         * Actions that depend on clipboard permission status
         */
        // UI reactions for browsers NOT allowing access to clipboard (purple paster patch)
        if ( Yes3.clipboardApiPermission !== 'granted' ){

            const $pasteTarget = $(`textarea#yes3-paste-${field_name}`);
               
            // has data: hide the purple paster patch
            if ( hasData ){
                if ( $pasteTarget.is(':visible')) {

                    $pasteTarget.hide();
                    K++;
                }
            }
            // does not have data
            else {

                // force the purple paster patch text
                if ( $pasteTarget.val() !== Yes3.labels.paste_image_here ){

                    $pasteTarget.val( Yes3.labels.paste_image_here );
                    K++;
                }

                // show purple paster patch if hidden
                if ( $pasteTarget.is(':hidden')) {

                    $pasteTarget.show();
                    K++;
                }
            }
        } 

        /**
         * UI reactions for browsers ALLOWING access to clipboard (purple paster link)
         * Namely, insert the purple paster link if not found.
         * Note: the purple paster link is removed by REDCap when the form refreshes after an upload,
         * so we don't need to remove it ourselves.      
         */
        else if ( !$fileUploadContainer.find('.yes3-paste-link').length){

            //console.log('==> mutation: yes3-paste-link not found for ' + field_name);

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
                'class': 'd-print-none yes3-paste-link yes3-paste',
                'title': Yes3.labels.click_to_paste,
                'style': `font-size:${pasteLinkFontSize};`,
                'aria-label': Yes3.labels.click_to_paste,
                'html': ( hasData ) ? "<i class='fa fa-clipboard mr-1'></i>Paste" : "<i class='fa fa-clipboard mr-1'></i>Paste image"
            })
            .attr('field_name', field_name)
            .on('click', function(){
            
                Yes3.processClipboardImage(field_name)          
            } );

            $pasteLinkContainer.append( $delim );
            $pasteLinkContainer.append( $pasteLink );

            $linkContainer.append( $pasteLinkContainer );

            /**
             * Tighten up the spacing in the link container, to make space for the new 'paste image' links 
             */
            $linkContainer.find('*').each(function(){

                const padR = parseFloat($(this).css('padding-right'))/2.0;
                const padL = parseFloat($(this).css('padding-right'))/2.0;
            
                $(this).css('padding-right', padR+'px');
                $(this).css('padding-left', padL+'px');

                //console.log('linkContainer', field_name, this, $(this).css('padding-right'), padL, padR, $(this).html().indexOf('&nbsp;'));
            })

            //K++;

            /**
             * the link container has an annoying trailing hard space
             * that may be in two different places(!)
             */
            if ( hasData ){

                let $linkSpan = $fileUploadContainer.find('span.edoc-link');

                // not there? try this...
                if ( !$linkSpan.length ){

                    $linkSpan = $fileUploadContainer.find('span.sendit-lnk');
                    K++;
                }

                if ( $linkSpan.length ){
                    
                    $linkSpan.html( $linkSpan.html().replaceAll('&nbsp;', '') );
                    K++;
                }
            }

        } // browser allows access to clipboard and paste link element undefined

        /**
         * all done if the enhanced layout is disabled
         */
        if ( Yes3.upload_field_layout !== 'enhanced' ){

            continue;
        }

        const $fullwidthImageContainer = $(`td#yes3-inline-image-${field_name}`);

        // if no upload then hide the fullwidth container
        if ( !hasData ){

            // if upload has been removed but relocated upload image remains, remove it
            if ( $fullwidthImageContainer.is(':visible')) {

                $fullwidthImageContainer.hide().find('img').remove();
                K++;
            }
        }
        // otherwise show it and relocate the inline image to it
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
                K++;
            }
        }
    }

    if ( K ){

        console.log('mutation reactions', new Date(), K);
    }
}

/**
 * A mutation monitor, tailored to branching, upload and paste actions
 */
Yes3.startMutationMonitoring = function(){

    setInterval(Yes3.Monitor, Yes3.MONITOR_INTERVAL);
}

/**
 * ref: https://stackoverflow.com/questions/18650168/convert-blob-to-base64
 * 
 * modified to remove small comma-separated header inserted by Filereader
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
        'title': Yes3.labels.click_to_close_message,
        'html': `<p class='yes3-centered'>${msg}</p><p class='yes3-subtle yes3-small yes3-centered'>${Yes3.labels.click_to_close_message}</p>`
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

document.addEventListener('paste', function (evt) {

    console.log('paste event called', evt.target );

    if ( !evt.target.classList || !evt.target.classList.contains('yes3-paste') ) {

        return;
    }

    let field_name = '';

    for (const attr of evt.target.attributes ) {

        if ( attr.name==='yes3-field-name' ){

            field_name = attr.value;
            break;
        }
    }

    //console.log('field_name:', field_name); 

    if ( field_name.length===0 ){

        return;
    }

    /*
        ClipboardEvent.clipboardData is a dataTransfer object:

        ref: https://developer.mozilla.org/en-US/docs/Web/API/ClipboardEvent/clipboardData
        items ref: https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem
    */

    const clipboardItems = evt.clipboardData.items;

    // ref: https://stackoverflow.com/questions/2125714/explanation-of-slice-call-in-javascript
    const items = [].slice.call(clipboardItems).filter(function (item) {

        // Filter the image items only
        return item.type.indexOf('image') !== -1;
    });

    if (items.length === 0) {

        Yes3.postErrorMessage(Yes3.labels.no_image_on_clipboard);
        return;
    }

    const item = items[0];

    const blob = item.getAsFile();

    Yes3.uploadClipboardImage(field_name, blob);

});

Yes3.autoPopulate = function(){

    // no autocomplete if form is marked 'completed'
    
    const completion = $(`tr#${Yes3.instrument}_complete-tr select[name=${Yes3.instrument}_complete]`).val();

    if ( completion === '2' ){

        return;
    }

    for (const field_name in Yes3.initializations) {

        const $input = $(`tr#${field_name}-tr input[name=${field_name}]`);

        if ( $input.length && !$input.val() ){

            $input
                .val(Yes3.initializations[field_name])
                .addClass('calcChanged')
                .trigger('change')
            ;
        }
    } 
}

$(function(){

    console.log('welcome to clipboard paster');

    Yes3.autoPopulate();

    Yes3.isClipboardApiSupported();

    Yes3.UI(); // UI renovations

    Yes3.startMutationMonitoring();
})