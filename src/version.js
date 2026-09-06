// Which build is this? The production build stamps the package version in through an esbuild
// define; when src/ runs unbuilt as native modules there is no build, so it says so.
//
// It exists because of a support thread: a fix was live on the CDN while a reader's browser
// still ran the previous bundle from cache, and nothing on screen or in the console said which.
export const VERSION = (typeof __AP_VERSION__ !== 'undefined') ? __AP_VERSION__ : 'dev';
