const path = require('path');

module.exports = {
  entry: './www/src/app.ts',
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'www/dist'),
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  devtool: 'source-map',
  mode: 'development', // Override with --mode flag if needed
};
