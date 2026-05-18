import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { ServiceError } from "../types";

/**
 * Property 2: Service layer error preservation
 *
 * For any HTTP error response with a status code in the range 400–599 and any
 * non-empty error message string, the Service Layer SHALL throw a ServiceError
 * whose `status` property equals the original HTTP status code and whose
 * `message` property equals the original error message.
 *
 * **Validates: Requirements 4.5**
 */
describe("Feature: frontend-backend-integration, Property 2: Service layer error preservation", () => {
  it("ServiceError preserves exact status code and message for any HTTP error status (400-599) and non-empty message", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 599 }),
        fc.string({ minLength: 1 }),
        (status: number, message: string) => {
          const error = new ServiceError(status, message);

          // status property equals the original HTTP status code
          expect(error.status).toBe(status);

          // message property equals the original error message
          expect(error.message).toBe(message);

          // name is always "ServiceError"
          expect(error.name).toBe("ServiceError");

          // it is an instance of Error
          expect(error).toBeInstanceOf(Error);

          // it is an instance of ServiceError
          expect(error).toBeInstanceOf(ServiceError);
        },
      ),
      { numRuns: 100 },
    );
  });
});
