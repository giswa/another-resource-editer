export const getConfirmExitAction = (input, key) => {
  if (input === 'y' || input === 'Y') {
    return 'confirm';
  }

  if (input === 'q' || input === 'Q') {
    return 'quit';
  }

  if (input === 'n' || input === 'N' || key.escape) {
    return 'cancel';
  }

  return null;
};
