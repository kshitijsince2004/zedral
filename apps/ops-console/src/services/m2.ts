import { env } from "@/app/env";
import { apiFetch } from "./client";
import {
  SEED_MATERIALS,
  SEED_WORKCENTRES,
  SEED_CUSTOMERS,
  SEED_ROUTING,
  SEED_OPERATORS,
  SEED_SHIFTS,
} from "@/mocks/m2";
import type { Material, WorkCentre, Customer, RoutingRule, Operator, Shift } from "@/types/m2";
import { API } from "@/constants/api";

export async function getMaterials(): Promise<Material[]> {
  if (env.VITE_USE_MOCK) return Promise.resolve(SEED_MATERIALS);
  return apiFetch<Material[]>(API.m2.materials);
}

export async function getWorkCentres(): Promise<WorkCentre[]> {
  if (env.VITE_USE_MOCK) return Promise.resolve(SEED_WORKCENTRES);
  return apiFetch<WorkCentre[]>(API.m2.workCentres);
}

export async function getCustomers(): Promise<Customer[]> {
  if (env.VITE_USE_MOCK) return Promise.resolve(SEED_CUSTOMERS);
  return apiFetch<Customer[]>(API.m2.customers);
}

export async function getRoutings(): Promise<RoutingRule[]> {
  if (env.VITE_USE_MOCK) return Promise.resolve(SEED_ROUTING);
  return apiFetch<RoutingRule[]>(API.m2.routings);
}

export async function getOperators(): Promise<Operator[]> {
  if (env.VITE_USE_MOCK) return Promise.resolve(SEED_OPERATORS);
  return apiFetch<Operator[]>(API.m2.operators);
}

export async function getShifts(): Promise<Shift[]> {
  if (env.VITE_USE_MOCK) return Promise.resolve(SEED_SHIFTS);
  return apiFetch<Shift[]>(API.m2.shifts);
}
