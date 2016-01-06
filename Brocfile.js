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

/**
 * GATHERING AND CONFIGURING SOURCE TREES
 */
var root_files = funnel(src, {
    files: ['init.js', 'index.html']
});
var tree_with_conf = mergeTrees([root_files, src+'/src']);

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
        }
    ]
});

var js = funnel(tree_with_conf, {srcDir: '/js'});
var main_files = funnel(tree_with_conf, {
    files: ['index.html', 'init.js'],
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

if(conf.prod)
    js = uglifyJs(js);


/**
 * STYLES
 */
var css = compileSass([src], '/styles/main.scss', conf.deploy_dir + '/' + pkg.name + '.css');

module.exports = mergeTrees([css, js, main_files]);