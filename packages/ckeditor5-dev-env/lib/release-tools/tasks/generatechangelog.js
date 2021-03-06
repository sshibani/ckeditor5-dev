/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

const fs = require( 'fs' );
const conventionalChangelog = require( 'conventional-changelog' );
const chalk = require( 'chalk' );
const { tools, stream, logger } = require( '@ckeditor/ckeditor5-dev-utils' );
const getNewReleaseType = require( '../utils/getnewreleasetype' );
const hasCommitsFromLastRelease = require( '../utils/hascommitsfromlastrelease' );
const cli = require( '../utils/cli' );
const getPackageJson = require( '../utils/getpackagejson' );
const changelogUtils = require( '../utils/changelog' );

/**
 * Generates the release changelog based on commit messages in the repository.
 *
 * User can provide a version for the entry in changelog.
 *
 * If package does not have any commits, user has to confirm whether the changelog
 * should be generated.
 *
 * @returns {Promise}
 */
module.exports = function generateChangelog( newVersion = null ) {
	const log = logger();

	return new Promise( ( resolve ) => {
		const packageJson = getPackageJson();

		log.info( '' );
		log.info( chalk.bold.blue( `Generating changelog for "${ packageJson.name }"...` ) );

		let promise = Promise.resolve();

		if ( !newVersion ) {
			promise = promise.then( () => getNewReleaseType() )
				.then( ( response ) => {
					const newReleaseType = ( hasCommitsFromLastRelease() ) ? response.releaseType : null;

					return cli.provideVersion( packageJson.name, packageJson.version, newReleaseType );
				} );
		} else {
			promise = promise.then( () => newVersion );
		}

		return promise
			.then( ( version ) => {
				if ( version === 'skip' ) {
					return resolve();
				}

				if ( !fs.existsSync( changelogUtils.changelogFile ) ) {
					log.warning( 'Changelog file does not exist. Creating...' );

					changelogUtils.saveChangelog( changelogUtils.changelogHeader );
				}

				const context = {
					version
				};
				const gitRawCommitsOpts = {
					merges: undefined,
					firstParent: true
				};
				const parserOpts = require( '../changelog/parser-options' );
				const writerOpts = require( '../changelog/writer-options' );

				conventionalChangelog( {}, context, gitRawCommitsOpts, parserOpts, writerOpts )
					.pipe( saveChangelogPipe( version ) );
			} );

		function saveChangelogPipe( version ) {
			return stream.noop( ( changes ) => {
				const utils = require( '../utils/changelog' );

				let currentChangelog = utils.getChangelog();

				// Remove header from current changelog.
				currentChangelog = currentChangelog.replace( utils.changelogHeader, '' );

				// Concat header, new and current changelog.
				let newChangelog = utils.changelogHeader + changes.toString() + currentChangelog.trim();
				newChangelog = newChangelog.trim() + '\n';

				// Save the changelog.
				utils.saveChangelog( newChangelog );

				// Commit the changelog.
				tools.shExec( `git add ${ utils.changelogFile }`, { verbosity: 'error' } );
				tools.shExec( `git commit -m "Docs: Changelog."`, { verbosity: 'error' } );

				log.info( chalk.green( `Changelog for "${ packageJson.name }" (v${ version }) has been generated.` ) );

				resolve();
			} );
		}
	} );
};
