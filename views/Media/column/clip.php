<?= Q::tool('Media/episode', array_merge($clipParams, $episodeParams)) ?>

<?php if (!empty($transcript)): ?>
	<div class="transcript-container">
		<h2>Transcript</h2>
		<?= $transcript ?>
	</div>
<?php endif; ?>
