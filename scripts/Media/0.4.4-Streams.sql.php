<?php
// One-time template registration (Streams_Stream::syncRelations, called
// automatically on every stream save, does the actual work from here on —
// see Streams_Stream::registerRelations doc comment). Reuses the platform's
// own shared "Streams/search/all" hub (Streams/1.2.8-Streams.mysql) rather
// than a Media-specific one, matching the only existing precedent for this
// mechanism (Unaligned/0.2.3-Streams.mysql.php).
Streams_Stream::registerRelations('', 'Media/episode', 'Streams', 'Streams/search/all', array(
	'categories'
));
