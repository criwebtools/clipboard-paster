
Yes3.processPastableFields = function(){

    //console.log('processPastableFields', Yes3.pastable_fields);

    for(let i=0; i<Yes3.pastable_fields.length; i++){

        if ( !$(`td#yes3-inline-image-${Yes3.pastable_fields[i]}`).length ) {

            let $itemContainerRow = $(`tr#${Yes3.pastable_fields[i]}-tr`);

            $imageRow = $('<tr>', {

                'class': 'yes3-inline-image-row'
            }).append($('<td>', {

                'colspan': '2',
                'class': 'yes3-inline-image-container',
                'data-field_name': Yes3.pastable_fields[i],
                'id': `yes3-inline-image-${Yes3.pastable_fields[i]}`,
                'text': 'click here to paste an image from the clipboard',
                'title': 'click here to paste an image from the clipboard',
                'click': function(){

                    Yes3.pasteImage( Yes3.pastable_fields[i] );
                }
            }))

            $itemContainerRow.after( $imageRow );
        }
    }
}

Yes3.relocateInlineImages = function() {

    //$('tr.yes3-inline-image-row').remove();

    $('img.file-upload-inline').each(function(){

        if ( $(this).parent().hasClass('fileupload-container') ){

            const field_name = $(this).parent().attr('id').split('-')[2];

            //console.log('relocateInlineImages', field_name, this);

            Yes3.relocateInlineImage( field_name, $(this) );
        }
    })
}

Yes3.relocateInlineImage = function( field_name, $img ) {

    const $container = $(`td#yes3-inline-image-${field_name}`);
 
    $container
        .empty()
        .append($img)
    ;

    $img
        .removeClass('file-upload-inline')
        .addClass('yes3-file-upload-inline')
    ;
}

Yes3.relocateTextFields = function() {

    const $textFields = $('textarea.notesbox');

    $textFields.each(function(){

        const $tr = $(this).closest('tr');

        const field_name = $(this).attr('name');

        $(this).addClass('yes3-textarea');

        $inputRow = $('<tr>', {'class': 'yes3-textarea-row'})
            .append( $('<td>', {
                'colspan': '2',
                'class': 'yes3-textarea',
                'data-field_name': field_name,
                'id': `yes3-textarea-${field_name}`,
                'sq_id': field_name
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
    catch (error) {
        console.error(error.message);
    }
}

Yes3.notAnImage = function( field_name ){

    const $container = $(`td#yes3-inline-image-${field_name}`);

    const holdText = $container.html();

    $container.html(`<span class='yes3-error'>No can do: the clipboard contains non-image data.`);

    setTimeout(function(){
        $container.html(holdText);
    }, 3000);
}

Yes3.checkBranching = function(){

    $('tr.yes3-inline-image-row, tr.yes3-textarea-row').each(function(){

        if ( $(this).prev().is(':visible') ){

            if ( !$(this).is(":visible") ) $(this).show();
        }
        else {

            if ( $(this).is(":visible") ) $(this).hide();
        }
    })
}

Yes3.startBranchChecking = function(){

    setInterval(Yes3.checkBranching, 250);
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
      reader.readAsDataURL(blob);
    });
}

$(function(){

    Yes3.processPastableFields();

    Yes3.relocateInlineImages();

    Yes3.relocateTextFields();

    Yes3.startBranchChecking();

    document.addEventListener('DOMNodeInserted', function(e){

        if (e.target.nodeName.toUpperCase() === 'IMG' && 
            e.target.className.indexOf('file-upload-inline') !== -1 &&
            e.relatedNode.className.indexOf('fileupload-container') !== -1) {

            Yes3.relocateInlineImages();

            //console.log("IMAGE UPLOADED", e);
        }
    })

    document.addEventListener('DOMNodeRemoved', function(e){

        //console.log("DOMNodeRemoved", e, e.target, e.target.className);

        if ( e.target.className && e.target.className.indexOf('edoc-link') !== -1 ){

            const $container = $(`td#yes3-inline-image-${field_name}`);

            if ( $container.length ){

                const field_name = e.relatedNode.id.split('-')[0];

                $container
                    .empty()
                    .html( $container.attr('title') )
                ;

                //console.log('DOMNodeRemoved: edoc links removed', field_name, $container);

                Yes3.processPastableFields();
            }
        }
    })
   
})