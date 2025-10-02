module.exports = {
	globDirectory: 'dist/',
	globPatterns: [
		'**/*.{css,js,html,svg}'
	],
	swDest: 'dist/sw.js',
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	]
};