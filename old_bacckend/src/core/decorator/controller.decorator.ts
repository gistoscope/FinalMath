import { CONTROLLER_KEY } from "./decorators.key";

export const Controller = (basePath: string) => {
  return (target: any) => {
    Reflect.defineMetadata(CONTROLLER_KEY, basePath, target);
  };
};
