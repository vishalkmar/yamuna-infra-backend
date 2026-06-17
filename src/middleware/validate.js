const AppError = require('../utils/AppError');

// Joi-based validation middleware. Pass { body, params, query } schemas.
module.exports = schemas => (req, res, next) => {
  for (const key of ['body', 'params', 'query']) {
    if (schemas[key]) {
      const { error, value } = schemas[key].validate(req[key], { abortEarly: false, stripUnknown: true });
      if (error) {
        const details = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
        return next(new AppError('Validation failed', 422, details));
      }
      req[key] = value;
    }
  }
  next();
};
