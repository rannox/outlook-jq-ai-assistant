const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const fs = require('fs');
const os = require('os');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      taskpane: './src/taskpane/main.ts'
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
      publicPath: '/'
    },
    resolve: {
      extensions: ['.ts', '.js', '.json']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name][ext]'
          }
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/taskpane/taskpane.html',
        filename: 'taskpane.html',
        chunks: ['taskpane'],
        inject: 'body',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true
        } : false
      }),
      new CopyWebpackPlugin({
        patterns: [
          { 
            from: 'assets/', 
            to: 'assets/',
            noErrorOnMissing: true
          },
          { 
            from: 'manifest.xml', 
            to: 'manifest.xml',
            noErrorOnMissing: true
          },
          {
            from: 'src/commands/commands.html',
            to: 'commands.html',
            noErrorOnMissing: true
          },
          {
            from: 'src/taskpane/taskpane.css',
            to: 'taskpane.css',
            noErrorOnMissing: true
          }
        ]
      })
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      port: 3000,
      server: {
        type: 'https',
        options: {
          key: fs.readFileSync(path.join(os.homedir(), '.office-addin-dev-certs', 'localhost.key')),
          cert: fs.readFileSync(path.join(os.homedir(), '.office-addin-dev-certs', 'localhost.crt'))
        }
      },
      host: 'localhost',
      hot: true,
      open: false,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      },
      allowedHosts: 'all',
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
      },
    },
    devtool: isProduction ? false : 'eval-source-map',
    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
    stats: {
      errorDetails: true,
    },
  };
};