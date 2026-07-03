import babel from '@rollup/plugin-babel';
import shebang from 'rollup-plugin-add-shebang';

export default {
	input: 'index.js',
	output: {
		file: './.bin/resx-editor.js',
		format: 'es'
	},
  plugins: [
      babel(), 
      shebang({
      include: './.bin/resx-editor.js'
    }),]
};
