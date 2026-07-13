export const parseCliArgs = (argv = process.argv.slice(2)) => {
  const options = {
    file: 'Sample.resx',
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }

    if (argument === '--file' || argument === '-f') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('Missing value for --file/-f');
      }
      options.file = value;
      index += 1;
      continue;
    }

    if (argument.startsWith('--file=')) {
      options.file = argument.slice('--file='.length);
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
};
