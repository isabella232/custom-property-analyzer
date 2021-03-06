#!/usr/bin/env node

import {readFileSync, writeFileSync} from 'fs';

import program from 'commander';

import {analyzeCustomProperties} from './analyze-custom-properties';
import {stringToBoolean} from './string-to-boolean';

type LogLevel = 'verbose' | 'info' | 'error' | 'never';

interface Options {
  output?: string;
  outputErrors?: boolean;
  outputStats?: boolean;
  outputCustomProperties?: boolean;
  input?: string;
  customPropertyPattern?: string;
  pattern?: string;
  logLevel?: LogLevel;
  skipErrors?: boolean;
  ignore?: string;
}

program
  .option('-o, --output <string>', 'Output location.')
  .option('-e, --output-errors <boolean>', 'Include errors in output.', true)
  .option(
    '-C, --output-custom-properties <boolean>',
    'Include custom properties in output.',
    true,
  )
  .option('-s, --output-stats <boolean>', 'Include stats in output.', true)
  .option(
    '-i, --input <string>',
    'Input directory for known custom properties. Expects an array of string.',
  )
  .option(
    '-c, --custom-property-pattern <string>',
    'Regex to include custom properties.',
  )
  .option('-p, --pattern <string>', 'Glob pattern to find files', '**/*.css.')
  .option(
    '-l, --log-level <verbose|info|error|never>',
    'Determines the errors displayed. `verbose` will display everything. `info` will display everything except errors. `error` will only display errors. And `never` will not display any logs',
    'verbose',
  )
  .option(
    '-S, --skip-errors <boolean>',
    'Determines if error analysis will be executed.',
    'false',
  )
  .option(
    '-I, --ignore <string|string[]>',
    'A glob pattern or array of glob patterns to exclude matches. The string array only accepts json format.',
  )
  .version('0.0.1', '-v, --version', 'Output the current version');

program.parse(process.argv);

const {
  output,
  outputErrors,
  outputStats,
  outputCustomProperties,
  input,
  customPropertyPattern,
  pattern,
  logLevel,
  skipErrors,
  ignore,
} = program;

main({
  output,
  outputErrors: stringToBoolean(outputErrors),
  outputStats: stringToBoolean(outputStats),
  outputCustomProperties: stringToBoolean(outputCustomProperties),
  input,
  customPropertyPattern,
  pattern,
  logLevel,
  skipErrors: stringToBoolean(skipErrors),
  ignore,
});

function main({
  output,
  outputErrors,
  outputStats,
  outputCustomProperties,
  input,
  customPropertyPattern,
  pattern,
  logLevel = 'verbose',
  skipErrors,
  ignore,
}: Options) {
  return new Promise((resolve, reject) => {
    let knownCustomProperties: string[] = [];

    if (input) {
      try {
        knownCustomProperties = JSON.parse(
          readFileSync(input, {encoding: 'utf8'}),
        );
      } catch (err) {
        reject(err);
      }
    }

    analyzeCustomProperties({
      pattern,
      knownCustomProperties,
      customPropertyPattern,
      logLevel,
      skipErrors,
      ignore,
    })
      .then(([properties, errors, stats]) => {
        if (output) {
          writeFileSync(
            output,
            JSON.stringify(
              {
                ...(outputCustomProperties && {properties}),
                ...(outputErrors && {errors}),
                ...(outputStats && {stats}),
              },
              null,
              2,
            ),
          );
        }

        if (Object.keys(errors).length > 0) {
          process.exit(1);
        }

        resolve(true);
      })
      .catch((err) => reject(err));
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
