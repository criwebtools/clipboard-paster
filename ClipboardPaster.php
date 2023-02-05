<?php

namespace Yale\ClipboardPaster;

// use the REDCap tag to identify pasteable fields
define('YES3_CLIPBOARD_PASTER_TAG', 'INLINE');

class ClipboardPaster extends \ExternalModules\AbstractExternalModule
{
    /* === HOOK FUNCTIONS === */

    function redcap_data_entry_form ( $project_id, $record, $instrument, $event_id, $group_id, $repeat_instance = 1 ){

        $sql = "SELECT `field_name` FROM `redcap_metadata` WHERE `project_id`=? AND `form_name`=? AND `misc` LIKE CONCAT('%@', ?, '%')";

        if ( !$result = $this->query($sql, [$project_id, $instrument, YES3_CLIPBOARD_PASTER_TAG]) ) return;

        $fields = [];

        while ( $row = $result->fetch_assoc() ){

            $fields[] = $row['field_name'];
        }

        ?>
            <style>

                <?= file_get_contents( $this->getUrl("css/ClipboardPaster.css") ) ?>

            </style>

            <script>

                // namespace object for this EM
                const Yes3 = {

                    'user':             '<?= $this->getUser()->getUsername() ?>',
                    'user_rights':      <?= json_encode($this->getUser()->getRights()) ?>,
                    'project_id':       '<?= $project_id ?>',
                    'record':           '<?= $record ?>',
                    'instrument':       '<?= $instrument ?>',
                    'event_id':         '<?= $event_id ?>',
                    'group_id':         '<?= $group_id ?>',
                    'repeat_instance':  '<?= $repeat_instance ?>',
                    'pasteable_fields':  <?= json_encode( $fields ) ?>,
                    'notes_field_layout': '<?= $this->getProjectSetting('notes_field_layout') ?>',
                    'upload_field_layout': '<?= $this->getProjectSetting('upload_field_layout') ?>'
                }

                <?= file_get_contents( $this->getUrl("js/ClipboardPaster.js") ) ?>

            </script>

        <?php
    }
}