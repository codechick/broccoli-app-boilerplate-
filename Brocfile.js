var fs = require('fs');

const funnel = require('broccoli-funnel');
const concat = require('broccoli-concat');
const mergeTrees = require('broccoli-merge-trees');
const babel = require('broccoli-babel-transpiler');
const compileSass = require('broccoli-sass');
const replace = require('broccoli-replace');

/**
 * BUILD CONFS
 */
const pkg = require('./package.json');
const conf = require('./conf/conf.json');
const src = conf.src;
var sass_file_exists = false;

/**
 * TREES DEF (for hoisting and clarity purposes)
 */
var root_files;
// merging all the trees that need a configuration replacement
// this is done in order to take advantage of the plugin's cache that will keep the same as much as possible
var tree_with_conf;
var require_conf;

//building result
var js;
var css;
var main_files;

/**
 * GATHERING AND CONFIGURING SOURCE TREES
 */
root_files = funnel(src, {
    files : ['init.js', 'index.html']
});

require_conf = funnel('conf', {
    files: ['require-js-conf.js']
});

root_files = mergeTrees([root_files, require_conf]);

tree_with_conf = mergeTrees([root_files, src+'/src']);
tree_with_conf = new replace(tree_with_conf, {
    // A list of files to parse:
    files: [
        'index.html',
        '**/*.js'
    ],
    patterns: [
        {
            match: /\{\{LIB_REQUIREJS\}\}/g,
            replacement: function() { return conf.lib.REQUIREJS; }
        },
        {
            match: /\{\{JS_MAIN}\}/g,
            replacement: function() { return pkg.name + '.js'; }
        },
        {
            match: /\{\{CSS_MAIN\}\}/g,
            replacement: function() { return pkg.name + '.css'; }
        },
        {
            match: /\{\{MODULE_MAIN\}\}/g,
            replacement: function() { return pkg.name; }
        },
        {
            match: /\{\{JS_INIT}\}/g,
            replacement: function() { return 'init.js'; }
        },
        {
            match: /\{\{AUTHOR}\}/g,
            replacement: function() { return pkg.author; }
        },
        {
            match: /\{\{APP_DESC}\}/g,
            replacement: function() { return pkg.description; }
        }
    ]
});

js = funnel(tree_with_conf, {srcDir: '/js'});
main_files = funnel(tree_with_conf, {
    files: ['index.html', 'init.js', 'require-js-conf.js'],
    destDir: conf.deploy_dir
});


/**
 * JS
 */
js = babel(js, {
    stage: 0,
    moduleIds: true,
    modules: 'amd',
    browserPolyfill: true,

    // Transforms /index.js files to use their containing directory name
    getModuleId: function (name) {
        name = pkg.name + '/' + name;
        return name.replace(/\/index$/, '');
    },

    // Fix relative imports inside /index's
    resolveModuleSource: function (source, filename) {
        var match = filename.match(/(.+)\/index\.\S+$/i);

        // is this an import inside an /index file?
        if (match) {
            var path = match[1];
            return source
                .replace(/^\.\//, path + '/')
                .replace(/^\.\.\//, '');
        } else {
            return source;
        }
    }
});

js = concat(js, {
    inputFiles: [
        '**/*.js'
    ],
    outputFile: conf.deploy_dir + '/' + pkg.name + '.js'
});

/**
 * STYLES
 */
try {
    var stats = fs.lstatSync(src + '/src/sass/main.scss');

    if (stats.isFile()) {
        sass_file_exists = true;
    }
}
catch (e) {}

if(sass_file_exists) {
    var opts = {outputStyle: 'expanded'};
    if(conf.prod)
        opts.outputStyle = 'compressed';

    css = compileSass([src + '/src'], '/sass/main.scss', conf.deploy_dir + '/' + pkg.name + '.css', opts);
}
else
    css = funnel(src, {
        files: []
    });

if(conf.prod) {
    js = uglifyJs(js);
}

module.exports = mergeTrees([css, js, main_files]);