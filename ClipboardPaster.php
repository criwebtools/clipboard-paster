<?php

namespace Yale\ClipboardPaster;

ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

use Exception;
use REDCap;
use Project;

define('YES3_CLIPBOARD_PASTER_TAG', 'INLINE'); // use the REDCap tag

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
                    'pasteable_fields':  <?= json_encode( $fields ) ?>
                }

                <?= file_get_contents( $this->getUrl("js/ClipboardPaster.js") ) ?>

            </script>

        <?php
    }
}