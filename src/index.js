'use strict';

var _ = require('lodash'),
os = require('os'),
gutil = require('gulp-util'),
path = require('path'),
pkg = 'rhweb',
through = require('through2');

function camelCase(str) {
	return str.replace(/(-[A-Za-z]{1})/g, function($1) {
		return $1.replace('-', '').toUpperCase();
	});
}

module.exports = function (options) {
  const files = [];
  let content = '';

  const defaults = {
    extension: '.tpl.html',
    fileName: 'templates.js',
    moduleName: 'app'
  };

  const opts = _.merge(defaults, options);

  const header = [
    `(function () {`+os.EOL,
    `  'use strict';`+os.EOL,
    `  angular`+os.EOL,
    `    .module('<%= moduleName %>')`+os.EOL,
    `    .config(['$componentLoaderProvider', function ($componentLoaderProvider) {`+os.EOL
  ].join('');

  const footer = [
    `    }]);`+os.EOL,
    '}());'
  ].join('');

  return through.obj((file, encoding, next) => {
    if (!file || file.isNull() || file.path.indexOf('nrh-readme') >= 0 || file.path.indexOf('panels') >= 0) {
      return next();
    }

    if (file.isStream()) {
      return this.emit('error', new gutil.PluginError(pkg, 'Streaming not supported'));
    }

    files.push(file);

    next();
  }, function (callback) {
    if (files.length > 0) {
      content = files.map(file => {
        let component;
        // 'component-name':
        component = `          '${path.basename(file.path).replace(opts.extension, '')}': `;
        component = camelCase(component);
        // 'component-name': 'relative/path/to/component-name.html'
        component += `'${path.relative(file.base, file.path).replace(/\\/g, '/').replace("../src/main/webapp", ".")}'`;
        return component;
      }).join(`,`+os.EOL);
      // $componentLoaderProvider.setTemplateMapping(function (name) {
      //   return {
      //     'component-name': 'relative/path/to/component-name.html'
      //   }[name]
      // })
      content = [
        `      $componentLoaderProvider.setTemplateMapping(function (name) {`+os.EOL,
        `        return {`+os.EOL
      ].join('') + content + os.EOL;
      content += [`        }[name];`+os.EOL,
                 `      });`+os.EOL].join('');
    }

    const templates = _.template(header + content + footer)(opts);
    /* eslint no-invalid-this: 0 */
    this.push(new gutil.File({
      base: '',
      path: opts.fileName,
      contents: new Buffer(templates)
    }));
    callback();
  });
};
