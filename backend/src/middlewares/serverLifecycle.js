function createLifecycleState() {
  return { isShuttingDown: false };
}

function buildDrainMiddleware(lifecycleState) {
  return (req, res, next) => {
    if (!lifecycleState.isShuttingDown) {
      return next();
    }

    return res.status(503).json({
      success: false,
      message: 'Servidor em processo de encerramento. Tente novamente em instantes.'
    });
  };
}

module.exports = { createLifecycleState, buildDrainMiddleware };
