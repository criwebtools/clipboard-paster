Yes3.MONITOR_INTERVAL = 200; // branching and image relocation loop

Yes3.labels = {
    'click_to_paste': 'Click here to paste an image from the clipboard.',
    'no_clicks': 'To replace this image, first remove it.'
}

Yes3.UI = function(){

    /**
     * support for pasteable upload fields
     */
    Yes3.UI_PasteableUploadFields();

    /**
     * textarea renovations
     */
    Yes3.UI_TextAreaFields();

}

/**
 * Inserts a new full-width image container just below each upload
 * field marked with @INLINE.
 * 
 * These 'pasteable fields' are identified in the EM hook function and
 * passed in the global array Yes3.pasteable_fields.
 */
Yes3.UI_PasteableUploadFields = function() {
    
    for(let i=0; i<Yes3.pasteable_fields.length; i++){

        if ( !$(`td#yes3-inline-image-${Yes3.pasteable_fields[i]}`).length ) {

            let $itemContainerRow = $(`tr#${Yes3.pasteable_fields[i]}-tr`);

            $imageRow = $('<tr>', {

                'class': 'yes3-inline-image-row',
                'field_name': Yes3.pasteable_fields[i],
                'id': `yes3-inline-image-row-${Yes3.pasteable_fields[i]}`
            }).append($('<td>', {

                'colspan': '2',
                'class': 'yes3-inline-image-container yes3-clickable',
                'data-field_name': Yes3.pasteable_fields[i],
                'id': `yes3-inline-image-${Yes3.pasteable_fields[i]}`
            }))

            $itemContainerRow.after( $imageRow );
        }
    }
}

/**
 * relocates each textarea field to a new full-width container just beneath the original container
 */
Yes3.UI_TextAreaFields = function() {

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

        // remove the 'expand' link
        $(`div#${field_name}-expand`).remove();
    });
}

/**
 * ref: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/read
 * 
 * TESTED ON v12.5
 * 
 * Uses the clipboard API to read image from the clipboard.
 * Displays the image in the inserted full-width image container.
 * Uploads the image by simulating a signature upload:
 *  (1) Uses Filereader to convert image to base64 encoding.
 *  (2) Opens the REDCap upload dialog with the REDCap filePopUp() function.
 *  (3) Populates the myfile_base64 input with the base64 encoded image.
 *      This is interpreted as a signature image in DataEntry/file_upload.php 
 *  (4) Triggers the form's submit action.
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
        alert('The paste operation failed: see the console log for details.');
    }
}

// displays a red 'not an image' message in the paste region for 3 seconds
Yes3.notAnImage = function( field_name ){

    const $container = $(`td#yes3-inline-image-${field_name}`);

    const holdText = $container.html(); // hold for redisplay after 3 sec

    $container.html(`<span class='yes3-error'>No can do: the clipboard contains non-image data.`);

    setTimeout(function(){
        $container.html(holdText);
    }, 3000);
}

Yes3.monitor = function(){

    Yes3.monitorBranchingActions();
    Yes3.monitorUploadFieldActions();
}

/**
 * Reacts to branching logic affecting textarea fields managed by this EM.
 * Specifically, shows or hides the inserted rows
 * that contain the relocated inline images and textarea controls,
 * based on the visibility of the original field rows
 * which now contain the field labels and sundries.
 */
Yes3.monitorBranchingActions = function(){

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
Yes3.monitorUploadFieldActions = function(){

    // loop through all the inserted full-width image container rows
    $('tr.yes3-inline-image-row').each(function(){

        const $prevRow = $(this).prev(); // the original field row

        const field_name = $prevRow.attr('sq_id');

        // infers that the upload field is populated based on the presence of the 'download' link
        const hasData = $prevRow.find('a.filedownloadlink').is(':visible');

        // The inserted full-width image container
        const $fullwidthImageContainer = $(`td#yes3-inline-image-${field_name}`);

        // The normal REDCap inline image
        // after form render or upload the inline image will displayed 
        // in the original field row (and must be moved).
        const $inLineImage = $prevRow.find('img.file-upload-inline');

        if ( !hasData ){

            // if upload has been removed but relocated upload image remains, remove it
            $fullwidthImageContainer.find('img').remove();

            // if relocated image container is empty (no image or 'click here..' text),
            // populate it with the default 'click here..' message and add the listener
            if ( !$fullwidthImageContainer.html().length ){

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
                    .removeClass('yes3-clickable')
                    .append($inLineImage)
                    .attr('title', Yes3.labels.no_clicks)
                    .off('click')
                ;

                // Replace the image styling class
                $inLineImage
                    .removeClass('file-upload-inline')
                    .addClass('yes3-file-upload-inline')
                ;
            }
        }
    })
}

/**
 * A mutation monitor, tailored to branching, upload and paste actions
 */
Yes3.startMonitoring = function(){

    setInterval(Yes3.monitor, Yes3.MONITOR_INTERVAL);
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

$(function(){

    Yes3.UI(); // UI renovations

    Yes3.startMonitoring(); // start the mutation monitor (branching, pasting, upload reactions)
})