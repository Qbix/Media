<table class="Media_feeds_access" data-count="<?php echo count($messages) ?>">
    <tr class="Media_feeds_access_empty">
        <td class="Media_no_items">Nobody requested yet</td>
    </tr>
    <tr>
        <th>Date</th>
        <th>Camera</th>
        <th>User</th>
        <th>From Date</th>
        <th>To Date</th>
        <th>Reason</th>
    </tr>
<?php foreach ($messages as $message) { ?>
        <tr>
            <td class="Media_access_date"><?php echo $message->date ?></td>
            <td class="Media_access_feed"><?php echo $message->feed->title ?></td>
            <td class="Media_access_user"><?php echo Q::Tool("Users/avatar", array("userId" => $message->byUserId, 'icon' => 40, 'short' => true)) ?></td>
            <td class="Media_access_startDate"><?php echo $message->startDate ?></td>
            <td class="Media_access_endDate"><?php echo $message->endDate ?></td>
            <td class="Media_access_reason"><?php echo $message->reason ?></td>
        </tr>
<?php } ?>
</table>
