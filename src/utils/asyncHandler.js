export const asyncHandler = (fn) => {
  return (req, res, next) => {
    console.log(res)
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
};
