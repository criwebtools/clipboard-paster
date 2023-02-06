# Clipboard Paster
version 1.0.0  
February 2023  
Peter Charpentier, Yale University  
Ethan Goldstein, Boston University

## Introduction
figuring outThe Clipboard Paster was motivated by the need to store and display screenshots on REDCap forms. Our immediate use-case is a "bug and feature tracker" project we are using in our software development efforts. Now, instead of saving screen grabs as files, *figuring out where we saved them* and uploading them in separate steps, we can send them to a bug report form with a single click.

Additional features we required for our bug tracker were to render both the inline images and the notes fields as full-width elements, so that the form could better function as an online report.

## Features
- Images stored in the clipboard (e.g. screenshots) may be pasted into file upload fields designated as @INLINE.
- Double-clicking on an inline image will open it into a new window or tab, sized to the underlying dimensions if the image.
- Inline images may optionally be displayed in full-width containers placed just below the form fields.
- Notes fields may optionally be reformatted to full-with, resizeable input controls.

## Example 

### A simple bug tracking form, without the Clipboard Paster EM

Below is a form for reporting bugs that allows for up to three screenshots. Each of the three screenshot upload fields has been tagged with @INLINE.

![image of a form without enhacements](images/example0.png)

### After enabling the Clipboard Paster EM on the project

As you see, the only user interface change is the addition of the 'Paste image' links

![image of a form after enabling the Clipboard Paster EM](images/example1.png)

### After pasting an image

Here I have (1) copied an image (from a website, in this case, using 'copy image') and then (2) clicked on the 'Paste image' link. As you see, the image has been stored and is now displayed as an inline image. *Note that the 'Paste image' link is still present, except that it has been reduced to an icon.* The link label has been crowded out by the newly-rendered 'Upload new version', 'remove file' and 'Send-it' links.

Note that in this example, I clicked on an image on a web page, right-clicked and selected 'copy image' to place the image in the clipboard. The more common use-case for this feature will be to use a screen grabber like the Windows 'snipping' tool, the PrtSc button or the powerful Greenshot tool (https://getgreenshot.org/). Just take your shot and click the Paste image link!

![image of a form after pasting an image](images/example2.png)

Next I'll demonstrate the optional form rendering enhancements, but in passing I will first double-click on the inline image. As you see, it opens into a separate browser window sized to fit the original image. Now I can more closely examine the image, or move it to another screen as I look over the bug report. Note that this feature is enabled for all inline fields, not just those that contain pasted images.

![image of a form after double-clicking on an inline image](images/example3.png)

## Optional enhancements

### The EM configuration settings

The optional enhancements are enabled through the usual EM conguration link, as shown below. Here I have set both to 'enhanced', meaning that I want full-width renderings of both inline images and notes fields.

![image of the EM configuration settions](images/example4.png)

... and here is what the full treatment looks like! As you see, the inline image now occupies a full row on the form, as do all text fields. I have resized the 'steps to reproduce the error' notes box by dragging the lower-right corner down.

![image of the EM configuration settions](images/example5.png)

## Error handling

### Trying to paste an empty clipboard, or one with something other than an image in it

The clipboard can store any sort of object, and so if the last thing you copied was not an image, or if there's nothing in the clipboard, you will behold this message:

![image of an error message](images/example5.png)

The message box will go away after 10 seconds, or if you click on it.

All 'handled' Clipboard Paster errors will generate messages as above. If an unhandled condition is encountered, please get back to us at redcap@yale.edu.












