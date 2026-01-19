import { DTO_KEY } from "./decorators.key";

export function UseDTO(dtoClass: any) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    Reflect.defineMetadata(DTO_KEY, dtoClass, target, propertyKey.toString());
    return descriptor;
  };
}
