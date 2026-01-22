import { plainToInstance } from "class-transformer";
import { validate as classValidate } from "class-validator";
import { NextFunction, Request, Response } from "express";
import { ValidationException } from "../errors/index";
export const validate = async (dtoClass: any, data: any) => {
  const output = plainToInstance(dtoClass, data);
  const errors = await classValidate(output, {
    whitelist: false,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map((error) => ({
      property: error.property,
      constraints: error.constraints ? Object.values(error.constraints) : [],
    }));
    return {
      errors: errorMessages,
      output: null,
    };
  }

  return {
    errors: [],
    output,
  };
};
export const validateDtoHandler = (dtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { errors, output } = await validate(dtoClass, req.body);
      if (errors.length > 0) throw new ValidationException(errors);
      req.body = output;
      return next();
    } catch (error) {
      next(error);
    }
  };
};
