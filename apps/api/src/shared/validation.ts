import { badRequest } from "./errors";

export const requireString = (value: unknown, field: string, maxLength = 255): string => {
  if (typeof value !== "string") {
    throw badRequest(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw badRequest(`${field} is required`);
  }
  if (trimmed.length > maxLength) {
    throw badRequest(`${field} must be ${maxLength} characters or fewer`);
  }
  return trimmed;
};

export const optionalString = (value: unknown, field: string, maxLength = 255): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return requireString(value, field, maxLength);
};

export const requireInteger = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw badRequest(`${field} must be an integer`);
  }
  return value;
};

export const requireEnum = <T extends string>(value: unknown, field: string, allowed: readonly T[]): T => {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw badRequest(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
};

export const optionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw badRequest("Expected a boolean value");
  }
  return value;
};
