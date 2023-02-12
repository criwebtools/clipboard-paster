<?php

namespace Yale\ClipboardPaster;

use stdClass;

// use the REDCap tag to identify pasteable fields
define('YES3_CLIPBOARD_PASTER_TAG', 'INLINE');

class ClipboardPaster extends \ExternalModules\AbstractExternalModule
{
    /* === HOOK FUNCTIONS === */

    function redcap_data_entry_form ( $project_id, $record, $instrument, $event_id, $group_id, $repeat_instance = 1 ){

        $username = $this->getUser()->getUsername();

        /**
         * tags for fields autopopulated by user information
         */
        $user_info_tagmap = [

            'user_lastname' => '@USER-LASTNAME',
            'user_firstname' => '@USER-FIRSTNAME',
            'user_email' => '@USER-EMAIL'
        ];

        if ( $username ) {

            $user_info = $this->get_user_info($username);
            $user_rights = $this->getUser()->getRights();
        }
        else {

            $user_rights = [];
            $user_info = [];
        }

        $pasteable_fields = [];

        $initializations = new stdClass;

        $sql = "SELECT `field_name`, `misc` FROM `redcap_metadata` WHERE `project_id`=? AND `form_name`=? AND `misc` IS NOT NULL"; // AND `misc` LIKE '%INLINE%'";

        if ( $result = $this->query($sql, [$project_id, $instrument]) ) {
                    
            while ( $row = $result->fetch_assoc() ){

                $tags = $row['misc'];
                $field_name = $row['field_name'];

                if ( stripos($tags, '@INLINE') !== false ) {

                    $pasteable_fields[] = $field_name;
                }

                if ( $username ) {

                    foreach($user_info_tagmap as $user_info_field => $user_info_tag){

                        if ( stripos($tags, $user_info_tag) !== false && $user_info[$user_info_field] ) {

                            $initializations->$field_name = $user_info[$user_info_field];
                        }
                    }
                }
            }
        }

        ?>
            <style>

                <?= file_get_contents( $this->getUrl("css/ClipboardPaster.css") ) ?>

            </style>

            <script>

                // namespace object for this EM
                const Yes3 = {

                    'user':                 '<?= $username ?>',
                    'user_rights':          <?= json_encode($user_rights) ?>,
                    'project_id':           '<?= $project_id ?>',
                    'record':               '<?= $record ?>',
                    'instrument':           '<?= $instrument ?>',
                    'event_id':             '<?= $event_id ?>',
                    'group_id':             '<?= $group_id ?>',
                    'repeat_instance':      '<?= $repeat_instance ?>',
                    'pasteable_fields':     <?= json_encode( $pasteable_fields ) ?>,
                    'initializations':      <?= json_encode( $initializations ) ?>,
                    'notes_field_layout':   '<?= $this->getProjectSetting('notes_field_layout') ?>',
                    'upload_field_layout':  '<?= $this->getProjectSetting('upload_field_layout') ?>'
                }

                <?= file_get_contents( $this->getUrl("js/ClipboardPaster.js") ) ?>

            </script>

        <?php
    }

    private function get_user_info( $username ){

        $sql = "SELECT user_email, user_firstname, user_lastname FROM redcap_user_information WHERE username=? LIMIT 1";

        if ( $result = $this->query($sql, [$username]) ){

            return $result->fetch_assoc();
        }

        return [];
    }
}