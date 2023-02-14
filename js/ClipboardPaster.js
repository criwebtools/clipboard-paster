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


Yes3.DOWNLOAD_IMAGE_TEXT = 'download image';

Yes3.windowNumber = 0; // used in the naming of popups

/**
 * mutation reaction kill switch
 * 
 * meant to shut down mutation monitoring in runaway situations likely caused by coding error
 * 
 * current kill rule is: more than half of the monitoring intervals are reporting mutation reactions
 * 
 * this rule is applied every 5 seconds of monitoring (50 intervals)
 */

Yes3.MONITOR_INTERVAL = 100; // mutation monitor interval, ms
Yes3.MESSAGE_POST_TIME = 100000; // how long to display a message, ms
Yes3.mutationKillInterval = 0; // number of intervals for this kill check
Yes3.mutationKillIntervalLimit = 50; // number of intervals for kill switch check (5 sec)
Yes3.mutationKillMutationIndex = 0; // number of intervals having mutation reactions for this kill check
Yes3.mutationKillMutationIndexLimit = 25; // number of intervals having mutation reactions for Kill switch trigger
Yes3.mutationKillSwitchStatus = 0;
Yes3.mutationReactionCount = 0;

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
    'clipboard_permission_denied':  'Permission to programmatically access the clipboard is denied. See the EM documentation for instructions to allow access for your browser.',
    'switching_to_manual_paste':    "Permission to programmatically access the clipboard has been blocked, so switching to 'manual paste' mode.<br><br>You may manually paste images into the 'Paste image here' boxes rendered below."
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

    console.log('isClipboardApiSupported:', Yes3.clipboardApiIsSupported, Yes3.clipboardApiPermission);
}

/**
 * Take care of the various UI renovations
 */
Yes3.UI = function(){

    Yes3.UI_UploadFields();

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

        const $fieldContainer = Yes3.getFieldContainer(field_name);

        const $itemContainerRow = $(`tr#${field_name}-tr`);

        const $pasteTarget = $('<textarea>', {
            'id': 'yes3-paste-' + field_name,
            'class': 'yes3-paste-target yes3-paste',
            'text': Yes3.labels.paste_image_here,
            'title': Yes3.labels.paste_image_here_tooltip
            })
            .attr('field_name', field_name)
        ;

        $fieldContainer.prepend( $pasteTarget );
    }
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

        console.warn('processClipboardImage:premission', permission);

        if (permission.state === 'denied') {

            Yes3.clipboardApiPermission = 'denied';

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

        //console.error(e);

        Yes3.clipboardApiPermission = 'denied';

        //Yes3.postErrorMessage( `${e}<br><br>${Yes3.labels.switching_to_manual_paste}`);
        Yes3.postErrorMessage( Yes3.labels.switching_to_manual_paste );
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
 */

Yes3.uploadClipboardImage = async function( field_name, blob ){

    try {

        const base64data = await Yes3.blobToBase64(blob);

        filePopUp(field_name,0,0);

        // fill out the popup form as if it were a signature
        $('form#form_file_upload').find('input[name=myfile_base64]').val(base64data);

        $('form#form_file_upload').trigger('submit');
    }
    catch(e) {

        Yes3.postErrorMessage(e);
    }
}

Yes3.Monitor = function(){

    if ( Yes3.mutationKillSwitchStatus===0 ){

        const K = Yes3.Monitor_UploadFieldActions();

        if ( K ){

            Yes3.mutationReactionCount += K;
            Yes3.mutationKillMutationIndex++;

            console.log(`mutation monitor: ${K} reactions this interval; ${Yes3.mutationReactionCount} total reactions; index=${Yes3.mutationKillMutationIndex}.`);
        }

        Yes3.mutationKillInterval++;

        if ( Yes3.mutationKillInterval >= Yes3.mutationKillIntervalLimit ){

            if ( Yes3.mutationKillMutationIndex > Yes3.mutationKillMutationIndexLimit ){

                console.error('Mutation monitoring disabled!');
                //Yes3.postErrorMessage('ERROR: excessive mutation reactions have been detected. Mutation monitoring is shut down!')
                Yes3.postErrorMessage('ZOMBIE APOCALYPSE DETECTED!<br>Mutation kill switch activated.')
                Yes3.mutationKillSwitchStatus = 1;
            }

            Yes3.mutationKillInterval = 0;
            Yes3.mutationKillMutationIndex = 0;
        }
    }
}

/**
 *  EXPLORER'S GUIDE TO MUTATION REACTIONS
 * 
 *  div#fileupload-container-{field_name}.fileupload-container      Yes3.getFieldContainer(field_name)
 *      
 *      textarea#yes3-paste-{field_name}.yes3-paste-target          static; injected by Yes3.UI_UploadFields. 
 *                                                                  Visibility set by Yes3.Monitor_UploadFieldActions > Yes3.setPasteBoxVisibility
 * 
 *      a#{field_name}-link.filedownloadlink                        static
 * 
 *      div#{field_name}-linknew                                    $linkContainer                          
 * 
 *          a.fileuploadlink                                        dynamic; rendered by REDCap as either "upload file" or "upload new version"
 * 
 *          span.yes3-paste-link                                    dynamic; injected by Yes3.Monitor_UploadFieldActions > Yes3.injectPasteLink 
 * 
 */


/**
 * Reacts to user paste, upload and remove actions:
 *  (1) Ensure inline image has a double-click listener
 *  (2) Ensure that the appropriate paste link is onscreen, depending on whether inline image is displayed (clipboard API supported)
 *  (3) or 'paster patch' is visible or hidden, as appropriate (clipboard API not supported)
 */
Yes3.Monitor_UploadFieldActions = function(){

    let K = 0; // count of mutation reactions
   
    for(let i=0; i<Yes3.pasteable_fields.length; i++){

        const field_name = Yes3.pasteable_fields[i];

        // skip fields hidden through branching logic

        if ( $(`tr#${field_name}-tr`).is(':hidden') ) {

            continue;
        }
        
        /**
         * react to inline image and download link mutations
         */
        K += Yes3.imageAndDownloadLinkMutations( field_name );

        /**
         * reactions that depend on clipboard permission status
         * permissions: prompt, granted, denied
         * 
         * note that this will react to the user action 'block' from the clipboard api permission prompt
         * ('allow' is assumed initially, and so the paste links are rendered and the paste boxes are hidden)
         */
        if ( !Yes3.clipboardApiIsSupported || Yes3.clipboardApiPermission === 'denied' ){

            K += Yes3.removePasteLink( field_name );
            K += Yes3.setPasteBoxVisibility( field_name );
        } 
        else {

            K += Yes3.setPasteBoxVisibility( field_name, true );
            K += Yes3.injectPasteLink( field_name );
        }
    }

    return K;
}

Yes3.getFieldContainer = function( field_name ){

    return  $(`#fileupload-container-${field_name}`);
}

Yes3.hasData = function( field_name){

    // if the download link is visible we conclude that the upload has been made, hence has data
    return $(`a#${field_name}-link.filedownloadlink`).is(':visible');
}

/**
 * If there is an upload stored for this field:
 * 
 * (1) Add double-click listener for inline image (opens new window)
 * (2) Replace the system download link name display pattern "signature_*" with "download image".
 *     (uploaded images are interpreted as signatures and given a misleading file name "signature_*.png")
 * 
 */
Yes3.imageAndDownloadLinkMutations = function( field_name ){

    if ( !Yes3.hasData( field_name ) ){

        return 0;
    }

    let K = 0;
            
    const $inLineImage = Yes3.getFieldContainer(field_name).find('img.file-upload-inline');

    // the class "yes3_handled" prevents repeated double-click event handler attachments
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

    return K;
}

Yes3.setPasteBoxVisibility = function( field_name, forceHide ){

    forceHide = forceHide || false;

    K = 0;

    const $pasteTarget = $(`textarea#yes3-paste-${field_name}`);
               
    // has data: hide the purple paster patch
    if ( forceHide || Yes3.hasData(field_name) ){

        if ( $pasteTarget.is(':visible')) {

            $pasteTarget.hide();
            K++;
        }
    }
    // does not have data: show paster patch, force text to the canned label
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

    return K;
}

Yes3.removePasteLink = function( field_name ){

    // all upload process links go here
    const $fieldContainer = Yes3.getFieldContainer(field_name);

    // if nothing to do then bolt
    if ( $fieldContainer.find('.yes3-paste-link').length ){

        $fieldContainer.find('.yes3-paste-link').remove();

        return 1;
    }

    return 0;
}

Yes3.injectPasteLink = function( field_name ){

    // all upload process links go here
    const $fieldContainer = Yes3.getFieldContainer(field_name);

    // if nothing to do then bolt
    if ( $fieldContainer.find('.yes3-paste-link').length ){

        return 0;
    }

    let K = 0;

    const hasData = Yes3.hasData(field_name);

    // 'send-it', 'remove' etc links. This is where the new 'paste' link goes
    const $linkContainer = $(`div#${field_name}-linknew`); 

    // this will match either the 'Upload file' or 'Upload new version' links
    const $fileUploadLink = $fieldContainer.find('a.fileuploadlink');

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

    K++;

    /**
     * Tighten up the spacing in the link container, to make space for the new 'paste image' link
     */
    $linkContainer.find('*').each(function(){

        const padR = parseFloat($(this).css('padding-right'))/2.0;
        const padL = parseFloat($(this).css('padding-right'))/2.0;
    
        $(this).css('padding-right', padR+'px');
        $(this).css('padding-left', padL+'px');

        K++;

        //console.log('linkContainer', field_name, this, $(this).css('padding-right'), padL, padR, $(this).html().indexOf('&nbsp;'));
    })

    /**
     * the link container has an annoying trailing hard space
     * that may be in two different places(!)
     */
    if ( hasData ){

        let $linkSpan = $fieldContainer.find('span.edoc-link');

        // not there? try this...
        if ( !$linkSpan.length ){

            $linkSpan = $fieldContainer.find('span.sendit-lnk');
            K++;
        }

        if ( $linkSpan.length ){
            
            $linkSpan.html( $linkSpan.html().replaceAll('&nbsp;', '') );
            K++;
        }
    }

    return K;
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
    
    }, Yes3.MESSAGE_POST_TIME);
}

Yes3.removeErrorMessage = function(){

    $('div.yes3-error-message-container').remove();
}

/**
 * for browsers that require a user-initiated paste event (Firefox, ..)
 */
Yes3.addPasteEventListeners = function(){

    let pasteTargets = document.getElementsByClassName("yes3-paste-target");

    // create array from htmlCollection pasteTargets and attach listeners
    Array.from(pasteTargets).forEach((pasteTarget) => {

        pasteTarget.addEventListener('paste', function (evt) {

            const field_name = pasteTarget.getAttribute('field_name');
   
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
        })
    })
}

/**
 * autopopulate fields and values are passed to the client as the object Yes3.initializations
 */
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

    /**
     * sets:
     * 
     *      Yes3.clipboardApiIsSupported
     *      Yes3.clipboardApiPermission ('denied', 'granted', 'unavailable')
     */
    Yes3.isClipboardApiSupported();

    Yes3.autoPopulate();

    Yes3.UI(); // minor UI renovations

    /**
     * if the Clipboard API is not supported, then clipboard must
     * be read in response to a user-initiated paste event
     */
    if ( !Yes3.clipboardApiIsSupported ){

        Yes3.addPasteEventListeners();
    }

    Yes3.startMutationMonitoring();
})