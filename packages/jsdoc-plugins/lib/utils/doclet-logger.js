/**
 * @license Copyright (c) 2016-2017, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

'use strict';

const fsExtra = require( 'fs-extra' );

/**
 * Created for testing purpose.
 * You can add / remove this plugin in src/tasks/build-api-docs.js
 */
exports.handlers = {
	processingComplete( e ) {
		fsExtra.outputFileSync( process.cwd() + '/build/docs/output.json', JSON.stringify( e, null, 4 ) );
	}
};
