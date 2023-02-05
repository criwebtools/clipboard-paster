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

## Changes to the User Interface
We have tried to make minimal alterations to the REDCap form interface, and so to the user experience.

## Example: A simple bug tracker form 
Below is a form for reporting bugs that allows for up to three screenshots.

![image of a form without enhacements](images/example0.png)

