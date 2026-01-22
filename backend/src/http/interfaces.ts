import { Application } from "express";

export interface IRouter {
  register(app: Application): void;
}
