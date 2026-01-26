import { container, type InjectionToken } from "tsyringe";

/**
 * useService hook - Resolves a service from the global tsyringe container.
 * This connects the React UI to the class-based DI architecture.
 */
export function useService<T>(token: InjectionToken<T>): T {
  // Simple resolution. In a more advanced setup, you could use a Context
  // that provides the container, but since we use a global container in setupDIContainer(),
  // this is the most straightforward bridge.
  return container.resolve(token);
}
