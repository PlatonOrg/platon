import { OrderingDirections } from "@platon/core/common";
import { ResourceStatus } from "../enums/resource-status";
import { ResourceTypes } from "../enums/resource-types";

export enum ResourceOrderings {
  NAME = 'NAME',
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT',
  RELEVANCE = 'RELEVANCE',
}

export interface ResourceFilters {
  readonly types?: ResourceTypes[];
  readonly status?: ResourceStatus[];
  readonly search?: string;
  readonly period?: number;
  readonly members?: string[];
  readonly watchers?: string[];
  readonly owners?: string[];
  readonly views?: boolean;
  readonly offset?: number;
  readonly limit?: number;
  readonly parent?: string;
  readonly order?: ResourceOrderings;
  readonly direction?: OrderingDirections;
}
